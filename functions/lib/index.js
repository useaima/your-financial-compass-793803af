"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scheduledSummariesWeekly = exports.scheduledSummariesDaily = exports.scheduledSummaries = exports.receiptIngress = exports.chat = exports.stockRecommendations = exports.fetchFinanceNews = exports.generateInsights = exports.generateStatement = exports.financeCore = void 0;
const node_crypto_1 = require("node:crypto");
const app_1 = require("firebase-admin/app");
const auth_1 = require("firebase-admin/auth");
const firestore_1 = require("firebase-admin/firestore");
const v2_1 = require("firebase-functions/v2");
const https_1 = require("firebase-functions/v2/https");
const scheduler_1 = require("firebase-functions/v2/scheduler");
(0, app_1.initializeApp)();
const db = (0, firestore_1.getFirestore)();
db.settings({ ignoreUndefinedProperties: true });
(0, v2_1.setGlobalOptions)({ region: process.env.FUNCTION_REGION || "us-central1", timeoutSeconds: 120, memory: "1GiB" });
const auth = (0, auth_1.getAuth)();
const httpOptions = { cors: true };
const SUPPORT_BASE_URL = "https://support.useaima.com/articles";
const COLLECTIONS = {
    goals: "goals",
    budgetLimits: "budget_limits",
    spendingEvents: "spending_events",
    financialEntries: "financial_entries",
    subscriptions: "subscriptions",
    draftTransactions: "draft_transactions",
    importJobs: "import_jobs",
    notifications: "notifications",
    summaries: "summaries",
};
function userRef(uid) {
    return db.collection("users").doc(uid);
}
function userCollection(uid, name) {
    return userRef(uid).collection(name);
}
function nowIso() {
    return new Date().toISOString();
}
function toIsoDate(value, fallback = nowIso()) {
    if (typeof value === "string" && value.trim()) {
        const parsed = new Date(value);
        if (!Number.isNaN(parsed.getTime())) {
            return parsed.toISOString();
        }
    }
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
        return value.toISOString();
    }
    if (value instanceof firestore_1.Timestamp) {
        return value.toDate().toISOString();
    }
    return fallback;
}
function toDateOnly(value) {
    const iso = toIsoDate(value);
    return iso.slice(0, 10);
}
function asString(value, fallback = "") {
    return typeof value === "string" ? value.trim() : fallback;
}
function asNullableString(value) {
    const normalized = asString(value);
    return normalized || null;
}
function asNumber(value, fallback = 0) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : fallback;
}
function asBoolean(value, fallback = false) {
    if (typeof value === "boolean") {
        return value;
    }
    if (typeof value === "string") {
        const normalized = value.trim().toLowerCase();
        if (normalized === "true")
            return true;
        if (normalized === "false")
            return false;
    }
    return fallback;
}
function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}
function startOfMonth(date = new Date()) {
    return new Date(date.getFullYear(), date.getMonth(), 1);
}
function endOfMonth(date = new Date()) {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}
function daysBetween(from, to) {
    return Math.max(0, Math.ceil((to.getTime() - from.getTime()) / 86_400_000));
}
function monthKey(date = new Date()) {
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}
function hashKey(value) {
    return (0, node_crypto_1.createHash)("sha256").update(value).digest("hex").slice(0, 24);
}
function dedupeKeyForTransaction(input) {
    return hashKey(`${input.date}|${input.merchant.toLowerCase()}|${input.amount.toFixed(2)}`);
}
function sanitize(value) {
    if (value instanceof firestore_1.Timestamp) {
        return value.toDate().toISOString();
    }
    if (Array.isArray(value)) {
        return value.map((item) => sanitize(item));
    }
    if (value && typeof value === "object") {
        return Object.fromEntries(Object.entries(value).map(([key, inner]) => [key, sanitize(inner)]));
    }
    return value;
}
async function requireUser(req) {
    const authHeader = String(req.headers.authorization || req.headers.Authorization || "");
    if (!authHeader.startsWith("Bearer ")) {
        throw new Error("Missing bearer token.");
    }
    const decoded = await auth.verifyIdToken(authHeader.slice(7));
    return {
        uid: decoded.uid,
        email: decoded.email ?? null,
    };
}
function respondJson(res, status, payload) {
    res.status(status).set("Content-Type", "application/json").send(JSON.stringify(payload));
}
function respondError(res, status, message, details) {
    v2_1.logger.error(message, details);
    respondJson(res, status, { error: message });
}
function splitFullName(fullName) {
    const cleaned = fullName.trim().replace(/\s+/g, " ");
    if (!cleaned) {
        return { first_name: "", last_name: "" };
    }
    const [first_name, ...rest] = cleaned.split(" ");
    return { first_name, last_name: rest.join(" ") };
}
function defaultProfile(uid, email) {
    const name = splitFullName(email?.split("@")[0]?.replace(/[._-]+/g, " ") || "");
    const now = nowIso();
    return {
        user_id: uid,
        email,
        legacy_public_user_id: null,
        migrated_from_public: false,
        first_name: name.first_name,
        last_name: name.last_name,
        country: "United States",
        phone_number: "",
        user_type: "personal",
        updates_opt_in: true,
        password_setup_completed: true,
        cash_balance: 0,
        monthly_income: 0,
        monthly_fixed_expenses: 0,
        budgeting_focus: "Build a steady plan",
        intent_focus: "Get clear on my finances",
        biggest_problem: "Staying consistent",
        money_style: "Balanced",
        guidance_style: "Straightforward",
        goal_focus: "Short-term stability",
        subscription_awareness: "Still reviewing",
        target_monthly_savings: 0,
        onboarding_completed: false,
        onboarding_completed_at: null,
        created_at: now,
        updated_at: now,
    };
}
function normalizeProfile(uid, email, incoming, existing) {
    const base = existing ?? defaultProfile(uid, email);
    return {
        ...base,
        user_id: uid,
        email,
        legacy_public_user_id: asNullableString(incoming.legacy_public_user_id ?? base.legacy_public_user_id),
        migrated_from_public: asBoolean(incoming.migrated_from_public ?? base.migrated_from_public),
        first_name: asString(incoming.first_name ?? base.first_name),
        last_name: asString(incoming.last_name ?? base.last_name),
        country: asString(incoming.country ?? base.country) || "United States",
        phone_number: asString(incoming.phone_number ?? base.phone_number),
        user_type: incoming.user_type === "business" ? "business" : "personal",
        updates_opt_in: asBoolean(incoming.updates_opt_in ?? base.updates_opt_in, true),
        password_setup_completed: asBoolean(incoming.password_setup_completed ?? base.password_setup_completed, true),
        cash_balance: asNumber(incoming.cash_balance ?? base.cash_balance),
        monthly_income: asNumber(incoming.monthly_income ?? base.monthly_income),
        monthly_fixed_expenses: asNumber(incoming.monthly_fixed_expenses ?? base.monthly_fixed_expenses),
        budgeting_focus: asString(incoming.budgeting_focus ?? base.budgeting_focus),
        intent_focus: asString(incoming.intent_focus ?? base.intent_focus),
        biggest_problem: asString(incoming.biggest_problem ?? base.biggest_problem),
        money_style: asString(incoming.money_style ?? base.money_style),
        guidance_style: asString(incoming.guidance_style ?? base.guidance_style),
        goal_focus: asString(incoming.goal_focus ?? base.goal_focus),
        subscription_awareness: asString(incoming.subscription_awareness ?? base.subscription_awareness),
        target_monthly_savings: asNumber(incoming.target_monthly_savings ?? base.target_monthly_savings),
        onboarding_completed: asBoolean(incoming.onboarding_completed ?? base.onboarding_completed, false),
        onboarding_completed_at: incoming.onboarding_completed
            ? nowIso()
            : asNullableString(incoming.onboarding_completed_at ?? base.onboarding_completed_at),
        created_at: asString(base.created_at, nowIso()),
        updated_at: nowIso(),
    };
}
async function getProfile(uid, email) {
    const snapshot = await userRef(uid).get();
    if (!snapshot.exists) {
        return null;
    }
    return normalizeProfile(uid, email, sanitize(snapshot.data() || {}), sanitize(snapshot.data() || {}));
}
async function ensureProfile(uid, email) {
    const existing = await getProfile(uid, email);
    if (existing) {
        return existing;
    }
    return defaultProfile(uid, email);
}
async function saveProfile(uid, email, incoming, merge = true) {
    const existing = await getProfile(uid, email);
    const normalized = normalizeProfile(uid, email, incoming, existing);
    await userRef(uid).set(normalized, { merge });
    return normalized;
}
async function listDocuments(uid, collectionName) {
    const snapshot = await userCollection(uid, collectionName).get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...sanitize(doc.data()) }));
}
async function replaceCollection(uid, collectionName, items) {
    const existing = await userCollection(uid, collectionName).get();
    const batch = db.batch();
    for (const doc of existing.docs) {
        batch.delete(doc.ref);
    }
    for (const item of items) {
        const docId = asString(item.id) || (0, node_crypto_1.randomUUID)();
        const ref = userCollection(uid, collectionName).doc(docId);
        const createdAt = asString(item.created_at, nowIso());
        batch.set(ref, {
            ...item,
            user_id: uid,
            created_at: createdAt,
            updated_at: nowIso(),
        });
    }
    await batch.commit();
}
async function saveCollectionDoc(uid, collectionName, payload) {
    const docId = asString(payload.id) || (0, node_crypto_1.randomUUID)();
    const ref = userCollection(uid, collectionName).doc(docId);
    const existing = await ref.get();
    const existingData = sanitize(existing.data() || {});
    const createdAt = asString(existingData.created_at, nowIso());
    await ref.set({
        ...existingData,
        ...payload,
        id: docId,
        user_id: uid,
        created_at: createdAt,
        updated_at: nowIso(),
    }, { merge: true });
    return docId;
}
async function deleteCollectionDoc(uid, collectionName, docId) {
    if (!docId)
        return;
    await userCollection(uid, collectionName).doc(docId).delete();
}
function monthlySubscriptionCost(subscriptions) {
    return subscriptions
        .filter((subscription) => subscription.is_active !== false)
        .reduce((sum, subscription) => {
        const price = asNumber(subscription.price);
        return sum + (subscription.billing_cycle === "yearly" ? price / 12 : price);
    }, 0);
}
function passiveIncomeFromEntries(entries) {
    return entries
        .filter((entry) => entry.entry_type === "asset")
        .reduce((sum, entry) => sum + Math.max(0, asNumber(entry.cashflow)), 0);
}
function liabilityPayments(entries) {
    return entries
        .filter((entry) => entry.entry_type === "liability")
        .reduce((sum, entry) => sum + Math.max(0, asNumber(entry.payment)), 0);
}
function spendingThisMonth(spendingEvents) {
    const start = startOfMonth();
    return spendingEvents.reduce((sum, event) => {
        const eventDate = new Date(toIsoDate(event.date));
        if (eventDate >= start) {
            return sum + asNumber(event.total);
        }
        return sum;
    }, 0);
}
function latestSpendingDate(spendingEvents) {
    if (!spendingEvents.length)
        return null;
    return spendingEvents
        .map((event) => toIsoDate(event.date))
        .sort((left, right) => right.localeCompare(left))[0] ?? null;
}
function buildDashboardSummary(profile, financialEntries, subscriptions, spendingEvents) {
    const totalAssets = financialEntries
        .filter((entry) => entry.entry_type === "asset")
        .reduce((sum, entry) => sum + asNumber(entry.value), 0);
    const totalLiabilities = financialEntries
        .filter((entry) => entry.entry_type === "liability")
        .reduce((sum, entry) => sum + asNumber(entry.balance), 0);
    const monthlySubscriptions = monthlySubscriptionCost(subscriptions);
    const passiveIncome = passiveIncomeFromEntries(financialEntries);
    const monthlyCashflow = asNumber(profile.monthly_income) +
        passiveIncome -
        asNumber(profile.monthly_fixed_expenses) -
        monthlySubscriptions -
        liabilityPayments(financialEntries);
    const savingsRate = asNumber(profile.monthly_income) > 0
        ? clamp((monthlyCashflow / asNumber(profile.monthly_income)) * 100, -100, 100)
        : 0;
    const debtRatio = totalAssets > 0 ? totalLiabilities / totalAssets : totalLiabilities > 0 ? 1 : 0;
    const healthScore = Math.round(clamp(58 +
        clamp(savingsRate, 0, 30) +
        clamp(asNumber(profile.cash_balance) / 500, 0, 14) -
        debtRatio * 20, 12, 96));
    return {
        cash_balance: asNumber(profile.cash_balance),
        total_assets: totalAssets,
        total_liabilities: totalLiabilities,
        net_worth: totalAssets - totalLiabilities,
        monthly_income: asNumber(profile.monthly_income),
        monthly_fixed_expenses: asNumber(profile.monthly_fixed_expenses),
        monthly_subscription_total: monthlySubscriptions,
        monthly_cashflow: monthlyCashflow,
        savings_rate: savingsRate,
        health_score: healthScore,
        spending_this_month: spendingThisMonth(spendingEvents),
        latest_spending_date: latestSpendingDate(spendingEvents),
    };
}
function aggregateCategorySpend(spendingEvents, startDate) {
    const totals = new Map();
    for (const event of spendingEvents) {
        const eventDate = new Date(toIsoDate(event.date));
        if (eventDate < startDate) {
            continue;
        }
        const items = Array.isArray(event.items) ? event.items : [];
        if (!items.length) {
            const category = asString(event.category) || "Other";
            totals.set(category, (totals.get(category) || 0) + asNumber(event.total));
            continue;
        }
        for (const item of items) {
            const category = asString(item.category) || "Other";
            totals.set(category, (totals.get(category) || 0) + asNumber(item.amount));
        }
    }
    return totals;
}
function buildBudgetStatuses(budgetLimits, spendingEvents) {
    const totals = aggregateCategorySpend(spendingEvents, startOfMonth());
    return budgetLimits.map((limit) => {
        const spent = totals.get(asString(limit.category) || "Other") || 0;
        const monthlyLimit = Math.max(0, asNumber(limit.monthly_limit));
        const percentUsed = monthlyLimit > 0 ? (spent / monthlyLimit) * 100 : spent > 0 ? 100 : 0;
        let status = "healthy";
        if (percentUsed >= 100) {
            status = "over";
        }
        else if (percentUsed >= 80) {
            status = "watch";
        }
        return {
            category: asString(limit.category) || "Other",
            monthly_limit: monthlyLimit,
            spent_this_month: spent,
            remaining_amount: Math.max(0, monthlyLimit - spent),
            percent_used: percentUsed,
            status,
        };
    });
}
function buildGoalStatuses(goals) {
    const now = new Date();
    return goals.map((goal) => {
        const targetAmount = Math.max(0, asNumber(goal.target_amount));
        const currentAmount = Math.max(0, asNumber(goal.current_amount));
        const remainingAmount = Math.max(0, targetAmount - currentAmount);
        const deadline = toDateOnly(goal.deadline);
        const deadlineDate = new Date(deadline);
        const daysRemaining = Math.max(0, daysBetween(now, deadlineDate));
        const monthlyContributionNeeded = daysRemaining > 0 ? remainingAmount / Math.max(1, daysRemaining / 30) : remainingAmount;
        let status = "on_track";
        if (remainingAmount <= 0) {
            status = "achieved";
        }
        else if (daysRemaining <= 30 || currentAmount / Math.max(1, targetAmount) < 0.25) {
            status = "needs_attention";
        }
        return {
            id: asString(goal.id),
            name: asString(goal.name) || "Goal",
            icon: asString(goal.icon) || "🎯",
            target_amount: targetAmount,
            current_amount: currentAmount,
            remaining_amount: remainingAmount,
            progress_percent: targetAmount > 0 ? (currentAmount / targetAmount) * 100 : 0,
            deadline,
            days_remaining: daysRemaining,
            monthly_contribution_needed: monthlyContributionNeeded,
            status,
        };
    });
}
function buildPatternSummaries(spendingEvents) {
    if (spendingEvents.length < 2) {
        return [];
    }
    const now = new Date();
    const currentWindowStart = new Date(now.getTime() - 30 * 86_400_000);
    const previousWindowStart = new Date(now.getTime() - 60 * 86_400_000);
    const currentTotals = aggregateCategorySpend(spendingEvents, currentWindowStart);
    const previousTotals = new Map();
    for (const event of spendingEvents) {
        const eventDate = new Date(toIsoDate(event.date));
        if (eventDate < previousWindowStart || eventDate >= currentWindowStart) {
            continue;
        }
        const items = Array.isArray(event.items) ? event.items : [];
        for (const item of items) {
            const category = asString(item.category) || "Other";
            previousTotals.set(category, (previousTotals.get(category) || 0) + asNumber(item.amount));
        }
    }
    return [...currentTotals.entries()]
        .sort((left, right) => right[1] - left[1])
        .slice(0, 3)
        .map(([category, amount], index) => {
        const previous = previousTotals.get(category) || 0;
        const delta = amount - previous;
        const direction = delta > 10 ? "up" : delta < -10 ? "down" : "steady";
        return {
            id: `pattern-${category}-${index}`,
            title: direction === "up"
                ? `${category} is climbing`
                : direction === "down"
                    ? `${category} is cooling off`
                    : `${category} is holding steady`,
            body: direction === "up"
                ? `${category} spending is up by ${Math.abs(delta).toFixed(0)} versus the prior month window.`
                : direction === "down"
                    ? `${category} spending is down by ${Math.abs(delta).toFixed(0)} compared with the previous window.`
                    : `${category} spending has stayed close to the previous month window.`,
            category,
            period: "monthly",
            amount,
            direction,
            confidence: spendingEvents.length >= 5 ? "medium" : "low",
        };
    });
}
function buildForecast(profile, dashboardSummary, spendingEvents) {
    if (!spendingEvents.length) {
        return {
            period_end: endOfMonth().toISOString(),
            days_remaining: daysBetween(new Date(), endOfMonth()),
            month_to_date_spending: 0,
            projected_end_of_month_spend: 0,
            projected_end_of_month_cash: asNumber(profile.cash_balance),
            projected_free_cash: asNumber(profile.cash_balance),
            spending_run_rate: 0,
            status: "needs_more_data",
            summary: "Keep logging real spending and eva will turn this into a grounded month-end forecast.",
        };
    }
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const daysElapsed = Math.max(1, daysBetween(monthStart, now) + 1);
    const daysRemaining = Math.max(0, daysBetween(now, monthEnd));
    const monthSpend = spendingEvents.reduce((sum, event) => {
        const eventDate = new Date(toIsoDate(event.date));
        return eventDate >= monthStart ? sum + asNumber(event.total) : sum;
    }, 0);
    const runRate = monthSpend / daysElapsed;
    const projectedSpend = runRate * monthEnd.getDate();
    const projectedCash = asNumber(profile.cash_balance) +
        dashboardSummary.monthly_income +
        passiveIncomeFromEntries([]) -
        dashboardSummary.monthly_fixed_expenses -
        dashboardSummary.monthly_subscription_total -
        projectedSpend;
    const projectedFreeCash = projectedCash - liabilityPayments([]);
    let status = "on_track";
    if (projectedFreeCash < 0) {
        status = "overextended";
    }
    else if (projectedFreeCash < Math.max(100, dashboardSummary.monthly_income * 0.1)) {
        status = "watch";
    }
    return {
        period_end: monthEnd.toISOString(),
        days_remaining: daysRemaining,
        month_to_date_spending: monthSpend,
        projected_end_of_month_spend: projectedSpend,
        projected_end_of_month_cash: projectedCash,
        projected_free_cash: projectedFreeCash,
        spending_run_rate: runRate,
        status,
        summary: status === "overextended"
            ? "Current spending would push month-end cash below zero if the pace holds."
            : status === "watch"
                ? "Month-end cash still looks positive, but there is not much room left if this pace continues."
                : "Your month-end cash forecast is still positive at the current spending pace.",
    };
}
function buildSubscriptionReview(subscriptions, profile) {
    if (!subscriptions.length) {
        return null;
    }
    const monthlyTotal = monthlySubscriptionCost(subscriptions);
    const income = asNumber(profile.monthly_income);
    const flagged = subscriptions.filter((subscription) => {
        const monthlyCost = subscription.billing_cycle === "yearly" ? asNumber(subscription.price) / 12 : asNumber(subscription.price);
        return monthlyCost >= 25 || (income > 0 && monthlyCost / income > 0.04);
    });
    return {
        status: flagged.length >= 3 ? "trim" : flagged.length > 0 ? "review" : "clear",
        active_count: subscriptions.filter((subscription) => subscription.is_active !== false).length,
        monthly_total: monthlyTotal,
        flagged_count: flagged.length,
        summary: flagged.length > 0
            ? `${flagged.length} subscription${flagged.length === 1 ? "" : "s"} looks worth a closer review.`
            : "Your active subscriptions look reasonably contained right now.",
        recommendations: flagged.slice(0, 3).map((subscription) => ({
            id: asString(subscription.id),
            name: asString(subscription.name) || "Subscription",
            action: flagged.length > 1 ? "review" : "keep",
            reason: "This recurring cost is large enough to deserve a manual review.",
            monthly_impact: subscription.billing_cycle === "yearly"
                ? asNumber(subscription.price) / 12
                : asNumber(subscription.price),
        })),
    };
}
function buildAdvice(bootstrap) {
    const advice = [];
    const latestSpending = bootstrap.spending_events?.[0];
    if (latestSpending) {
        advice.push({
            id: `ack-${latestSpending.id}`,
            type: "spending_acknowledgement",
            tone: "info",
            title: "Latest spending logged",
            body: `eva captured ${Number(latestSpending.total).toFixed(2)} from your latest chat or import activity.`,
            cta_label: "View spending history",
            cta_href: "/spending-history",
        });
    }
    const budgetWarning = (bootstrap.budget_statuses || []).find((status) => status.status !== "healthy");
    if (budgetWarning) {
        advice.push({
            id: `budget-${budgetWarning.category}`,
            type: "budget_warning",
            tone: budgetWarning.status === "over" ? "warning" : "info",
            title: `${budgetWarning.category} budget needs attention`,
            body: budgetWarning.status === "over"
                ? `You are past the ${budgetWarning.category} budget for this month.`
                : `You are close to the ${budgetWarning.category} budget limit for this month.`,
            cta_label: "Review budgets",
            cta_href: "/budget",
        });
    }
    const goalAttention = (bootstrap.goal_statuses || []).find((goal) => goal.status === "needs_attention");
    if (goalAttention) {
        advice.push({
            id: `goal-${goalAttention.id}`,
            type: "goal_progress_nudge",
            tone: "warning",
            title: `${goalAttention.name} needs a nudge`,
            body: `At the current pace, ${goalAttention.name} may miss its target unless you increase contributions soon.`,
            cta_label: "Review goals",
            cta_href: "/goals",
        });
    }
    if (!advice.length) {
        advice.push({
            id: "grounded-next-step",
            type: "grounded_advice",
            tone: "success",
            title: "Keep the loop going",
            body: "Log one more real expense or update a budget so eva can keep your forecast and advice grounded.",
            cta_label: "/chat",
            cta_href: "/chat",
        });
    }
    return advice;
}
function buildSummaryResult(period, spendingEvents) {
    const now = new Date();
    const start = new Date(now.getTime() - (period === "daily" ? 1 : 7) * 86_400_000);
    const relevant = spendingEvents.filter((event) => new Date(toIsoDate(event.date)) >= start);
    if (!relevant.length) {
        return {
            period,
            status: "needs_more_data",
            headline: period === "daily" ? "No spending logged today yet" : "No spending logged this week yet",
            body: "Once you log a few real transactions, eva will summarize them here automatically.",
            total_spent: 0,
            event_count: 0,
            top_category: null,
            generated_at: nowIso(),
        };
    }
    const totals = aggregateCategorySpend(relevant, new Date(0));
    const topEntry = [...totals.entries()].sort((left, right) => right[1] - left[1])[0] ?? null;
    const totalSpent = relevant.reduce((sum, event) => sum + asNumber(event.total), 0);
    return {
        period,
        status: "ready",
        headline: period === "daily"
            ? `You tracked ${totalSpent.toFixed(0)} today`
            : `You tracked ${totalSpent.toFixed(0)} over the last seven days`,
        body: topEntry
            ? `${topEntry[0]} is the biggest category in this ${period} window so far.`
            : "Your recent spending is starting to form a clearer pattern.",
        total_spent: totalSpent,
        event_count: relevant.length,
        top_category: topEntry?.[0] ?? null,
        generated_at: nowIso(),
    };
}
function buildAffordabilityResult(input, bootstrap) {
    const amount = Math.max(0, asNumber(input.amount));
    const cadence = input.cadence === "monthly" ? "monthly" : "one_time";
    const forecast = bootstrap.forecast || buildForecast(bootstrap.profile || {}, bootstrap.dashboard_summary || {}, bootstrap.spending_events || []);
    const projectedFreeCash = asNumber(forecast.projected_free_cash);
    const healthScore = asNumber(bootstrap.dashboard_summary?.health_score, 50);
    const effectiveAmount = cadence === "monthly" ? amount * 3 : amount;
    let status = "comfortable";
    if (forecast.status === "needs_more_data") {
        status = "needs_more_data";
    }
    else if (projectedFreeCash - effectiveAmount < 0) {
        status = "not_now";
    }
    else if (projectedFreeCash - effectiveAmount < Math.max(75, amount * 0.5)) {
        status = "tight";
    }
    return {
        amount,
        category: asNullableString(input.category),
        cadence,
        projected_free_cash: projectedFreeCash,
        health_score: healthScore,
        status,
        suggested_limit: Math.max(0, projectedFreeCash * 0.35),
        summary: status === "comfortable"
            ? "This fits inside your current projected free cash with some room left."
            : status === "tight"
                ? "You could afford this, but it would use up most of the cushion in your current forecast."
                : status === "not_now"
                    ? "This would likely push your forecast below a comfortable buffer right now."
                    : "eva needs a bit more real spending data before it can give a confident affordability answer.",
    };
}
function buildEmptyFlags(bootstrap) {
    return {
        has_spending_history: (bootstrap.spending_events || []).length > 0,
        has_goals: (bootstrap.goals || []).length > 0,
        has_budget_limits: (bootstrap.budget_limits || []).length > 0,
        has_subscriptions: (bootstrap.subscriptions || []).length > 0,
        has_balance_sheet: (bootstrap.financial_entries || []).length > 0,
    };
}
async function buildBootstrap(uid, email) {
    const profile = await getProfile(uid, email);
    const effectiveProfile = profile ?? defaultProfile(uid, email);
    const [goals, budgetLimits, spendingEvents, financialEntries, subscriptions, importJobs, draftTransactions, notifications] = await Promise.all([
        listDocuments(uid, COLLECTIONS.goals),
        listDocuments(uid, COLLECTIONS.budgetLimits),
        listDocuments(uid, COLLECTIONS.spendingEvents),
        listDocuments(uid, COLLECTIONS.financialEntries),
        listDocuments(uid, COLLECTIONS.subscriptions),
        listDocuments(uid, COLLECTIONS.importJobs),
        listDocuments(uid, COLLECTIONS.draftTransactions),
        listDocuments(uid, COLLECTIONS.notifications),
    ]);
    spendingEvents.sort((left, right) => toIsoDate(right.date).localeCompare(toIsoDate(left.date)));
    goals.sort((left, right) => toIsoDate(left.deadline).localeCompare(toIsoDate(right.deadline)));
    notifications.sort((left, right) => toIsoDate(right.created_at).localeCompare(toIsoDate(left.created_at)));
    draftTransactions.sort((left, right) => toIsoDate(right.created_at).localeCompare(toIsoDate(left.created_at)));
    importJobs.sort((left, right) => toIsoDate(right.created_at).localeCompare(toIsoDate(left.created_at)));
    const dashboardSummary = buildDashboardSummary(effectiveProfile, financialEntries, subscriptions, spendingEvents);
    const budgetStatuses = buildBudgetStatuses(budgetLimits, spendingEvents);
    const goalStatuses = buildGoalStatuses(goals);
    const patternSummaries = buildPatternSummaries(spendingEvents);
    const forecast = buildForecast(effectiveProfile, dashboardSummary, spendingEvents);
    const subscriptionReview = buildSubscriptionReview(subscriptions, effectiveProfile);
    const summaries = [buildSummaryResult("daily", spendingEvents), buildSummaryResult("weekly", spendingEvents)];
    const bootstrap = {
        user_id: uid,
        email,
        has_onboarded: Boolean(effectiveProfile.onboarding_completed),
        migration: {
            legacy_public_user_id: effectiveProfile.legacy_public_user_id ?? null,
            migrated_from_public: Boolean(effectiveProfile.migrated_from_public),
        },
        profile: profile,
        goals,
        budget_limits: budgetLimits,
        spending_events: spendingEvents,
        spending_logs: spendingEvents,
        financial_entries: financialEntries,
        subscriptions,
        dashboard_summary: dashboardSummary,
        advice: [],
        summaries,
        pattern_summaries: patternSummaries,
        forecast,
        subscription_review: subscriptionReview,
        budget_statuses: budgetStatuses,
        goal_statuses: goalStatuses,
        import_jobs: importJobs,
        draft_transactions: draftTransactions,
        notifications,
        empty_flags: {
            has_spending_history: spendingEvents.length > 0,
            has_goals: goals.length > 0,
            has_budget_limits: budgetLimits.length > 0,
            has_subscriptions: subscriptions.length > 0,
            has_balance_sheet: financialEntries.length > 0,
        },
    };
    bootstrap.advice = buildAdvice(bootstrap);
    bootstrap.empty_flags = buildEmptyFlags(bootstrap);
    return bootstrap;
}
async function replaceOnboardingData(uid, email, payload) {
    const normalizedProfile = normalizeProfile(uid, email, {
        ...(payload.profile || {}),
        onboarding_completed: true,
        onboarding_completed_at: nowIso(),
    }, await getProfile(uid, email));
    await userRef(uid).set(normalizedProfile, { merge: true });
    await Promise.all([
        replaceCollection(uid, COLLECTIONS.goals, Array.isArray(payload.goals) ? payload.goals : []),
        replaceCollection(uid, COLLECTIONS.budgetLimits, Array.isArray(payload.budget_limits) ? payload.budget_limits : []),
        replaceCollection(uid, COLLECTIONS.financialEntries, Array.isArray(payload.financial_entries) ? payload.financial_entries : []),
        replaceCollection(uid, COLLECTIONS.subscriptions, Array.isArray(payload.subscriptions) ? payload.subscriptions : []),
    ]);
}
function splitCsvLine(line) {
    const values = [];
    let current = "";
    let inQuotes = false;
    for (let index = 0; index < line.length; index += 1) {
        const char = line[index];
        if (char === '"') {
            if (inQuotes && line[index + 1] === '"') {
                current += '"';
                index += 1;
            }
            else {
                inQuotes = !inQuotes;
            }
            continue;
        }
        if (char === "," && !inQuotes) {
            values.push(current.trim());
            current = "";
            continue;
        }
        current += char;
    }
    values.push(current.trim());
    return values;
}
function guessCategory(description) {
    const text = description.toLowerCase();
    if (/uber|taxi|matatu|transport|fuel|gas/.test(text))
        return "Transport";
    if (/rent|mortgage|airbnb|apartment/.test(text))
        return "Housing";
    if (/food|lunch|dinner|breakfast|restaurant|grocer|market|coffee/.test(text))
        return "Food";
    if (/netflix|spotify|subscription|icloud|youtube/.test(text))
        return "Subscriptions";
    if (/hospital|clinic|medicine|doctor|pharmacy/.test(text))
        return "Health";
    if (/school|course|book|tuition/.test(text))
        return "Education";
    if (/cloth|shoe|fashion/.test(text))
        return "Shopping";
    if (/electric|water|utility|internet|wifi/.test(text))
        return "Utilities";
    return "Other";
}
function parseCsvTransactions(csvText) {
    const lines = csvText
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
    if (lines.length < 2) {
        throw new Error("CSV import needs a header row and at least one transaction row.");
    }
    const headers = splitCsvLine(lines[0]).map((header) => header.toLowerCase());
    const headerIndex = (names) => names.map((name) => headers.indexOf(name)).find((index) => index >= 0) ?? -1;
    const amountIndex = headerIndex(["amount", "total", "price"]);
    const dateIndex = headerIndex(["date", "transaction_date", "posted_at"]);
    const merchantIndex = headerIndex(["merchant", "name", "vendor"]);
    const descriptionIndex = headerIndex(["description", "details", "note"]);
    const categoryIndex = headerIndex(["category"]);
    if (amountIndex < 0) {
        throw new Error("The CSV needs an amount column so eva can create draft transactions.");
    }
    return lines.slice(1).map((line, index) => {
        const values = splitCsvLine(line);
        const amount = asNumber(values[amountIndex]);
        const merchant = asString(values[merchantIndex] ?? values[descriptionIndex] ?? `Row ${index + 1}`) || `Row ${index + 1}`;
        const description = asString(values[descriptionIndex] ?? merchant) || merchant;
        const transactionDate = toDateOnly(values[dateIndex] || nowIso());
        const category = asString(values[categoryIndex]) || guessCategory(description);
        return {
            transaction_date: transactionDate,
            merchant,
            category,
            amount,
            currency: "USD",
            description,
            raw_payload: {
                row: index + 2,
                line,
            },
        };
    }).filter((item) => item.amount > 0);
}
async function collectExistingDedupeKeys(uid) {
    const [events, drafts] = await Promise.all([
        listDocuments(uid, COLLECTIONS.spendingEvents),
        listDocuments(uid, COLLECTIONS.draftTransactions),
    ]);
    const keys = new Set();
    for (const event of events) {
        if (asString(event.dedupe_key)) {
            keys.add(asString(event.dedupe_key));
            continue;
        }
        const merchant = Array.isArray(event.items) && event.items[0] ? asString(event.items[0].description) : asString(event.raw_input);
        keys.add(dedupeKeyForTransaction({ date: toDateOnly(event.date), merchant, amount: asNumber(event.total) }));
    }
    for (const draft of drafts) {
        keys.add(asString(draft.dedupe_key));
    }
    return keys;
}
async function createNotification(uid, payload) {
    const ref = userCollection(uid, COLLECTIONS.notifications).doc();
    await ref.set({
        id: ref.id,
        user_id: uid,
        type: asString(payload.type) || "info",
        title: asString(payload.title) || "eva update",
        body: asString(payload.body),
        is_read: false,
        created_at: nowIso(),
        updated_at: nowIso(),
    });
}
async function importCsvTransactions(uid, csvText, fileName) {
    const rows = parseCsvTransactions(csvText);
    const existingKeys = await collectExistingDedupeKeys(uid);
    const importJobRef = userCollection(uid, COLLECTIONS.importJobs).doc();
    const createdAt = nowIso();
    let importedCount = 0;
    let duplicateCount = 0;
    for (const row of rows) {
        const dedupeKey = dedupeKeyForTransaction({
            date: row.transaction_date,
            merchant: row.merchant,
            amount: row.amount,
        });
        if (existingKeys.has(dedupeKey)) {
            duplicateCount += 1;
            continue;
        }
        existingKeys.add(dedupeKey);
        const draftRef = userCollection(uid, COLLECTIONS.draftTransactions).doc();
        await draftRef.set({
            id: draftRef.id,
            user_id: uid,
            import_job_id: importJobRef.id,
            source: "csv",
            transaction_date: row.transaction_date,
            merchant: row.merchant,
            category: row.category,
            amount: row.amount,
            currency: row.currency,
            description: row.description,
            dedupe_key: dedupeKey,
            status: "pending",
            raw_payload: row.raw_payload,
            created_at: createdAt,
            reviewed_at: null,
        });
        importedCount += 1;
    }
    await importJobRef.set({
        id: importJobRef.id,
        user_id: uid,
        source: "csv",
        status: importedCount > 0 ? "pending_review" : "processed",
        file_name: fileName,
        source_ref: null,
        imported_count: importedCount,
        duplicate_count: duplicateCount,
        error_message: null,
        created_at: createdAt,
        updated_at: nowIso(),
    });
    await createNotification(uid, {
        type: "import",
        title: importedCount > 0 ? "CSV ready for review" : "CSV import finished",
        body: importedCount > 0
            ? `${importedCount} draft transaction${importedCount === 1 ? "" : "s"} is ready for review.`
            : `eva did not add new drafts because the CSV rows matched existing records or were empty.`,
    });
}
async function reviewDraftTransaction(uid, input) {
    const draftId = asString(input.draftId);
    const draftRef = userCollection(uid, COLLECTIONS.draftTransactions).doc(draftId);
    const draftSnapshot = await draftRef.get();
    if (!draftSnapshot.exists) {
        throw new Error("Draft transaction not found.");
    }
    const draft = sanitize(draftSnapshot.data() || {});
    const mergedDraft = {
        ...draft,
        ...(input.updates || {}),
    };
    const decision = input.decision === "reject" ? "reject" : input.decision === "edit" ? "edit" : "approve";
    if (decision === "reject") {
        await draftRef.set({ status: "rejected", reviewed_at: nowIso(), updated_at: nowIso() }, { merge: true });
    }
    else {
        const dedupeKey = asString(mergedDraft.dedupe_key) || dedupeKeyForTransaction({
            date: toDateOnly(mergedDraft.transaction_date),
            merchant: asString(mergedDraft.merchant),
            amount: asNumber(mergedDraft.amount),
        });
        const existingKeys = await collectExistingDedupeKeys(uid);
        if (!existingKeys.has(dedupeKey) || draft.status === "pending") {
            const eventRef = userCollection(uid, COLLECTIONS.spendingEvents).doc();
            await eventRef.set({
                id: eventRef.id,
                user_id: uid,
                date: toDateOnly(mergedDraft.transaction_date),
                items: [
                    {
                        category: asString(mergedDraft.category) || "Other",
                        amount: asNumber(mergedDraft.amount),
                        description: asString(mergedDraft.description) || asString(mergedDraft.merchant),
                    },
                ],
                raw_input: asString(mergedDraft.description) || asString(mergedDraft.merchant),
                total: asNumber(mergedDraft.amount),
                source: asString(mergedDraft.source) || "csv",
                dedupe_key: dedupeKey,
                created_at: nowIso(),
            });
        }
        await draftRef.set({
            ...mergedDraft,
            dedupe_key: dedupeKey,
            status: "approved",
            reviewed_at: nowIso(),
            updated_at: nowIso(),
        }, { merge: true });
    }
    const importJobId = asString(draft.import_job_id);
    if (importJobId) {
        const siblings = await userCollection(uid, COLLECTIONS.draftTransactions)
            .where("import_job_id", "==", importJobId)
            .get();
        const pendingCount = siblings.docs.filter((doc) => asString(doc.data().status) === "pending").length;
        await userCollection(uid, COLLECTIONS.importJobs).doc(importJobId).set({
            status: pendingCount > 0 ? "pending_review" : "processed",
            updated_at: nowIso(),
        }, { merge: true });
    }
    await createNotification(uid, {
        type: "review",
        title: decision === "reject" ? "Draft rejected" : "Draft approved",
        body: decision === "reject"
            ? "The draft transaction stayed out of your canonical spending history."
            : "The reviewed draft is now part of your canonical spending history.",
    });
}
function parseAmountFromText(text) {
    const match = text.match(/(?:\$|usd\s*)?(\d+(?:\.\d{1,2})?)/i);
    return match ? asNumber(match[1]) : 0;
}
function parseMerchantFromText(text) {
    const patterns = [
        /(?:from|at)\s+([A-Za-z0-9&' .-]{2,60})/i,
        /merchant[:\s]+([A-Za-z0-9&' .-]{2,60})/i,
    ];
    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
            return match[1].trim();
        }
    }
    return "Forwarded receipt";
}
async function ingestForwardedReceipt(payload) {
    const uid = asString(payload.uid || payload.user_id);
    if (!uid) {
        throw new Error("Receipt ingestion requires a user_id.");
    }
    const text = asString(payload.text || payload.body || payload.html || payload.subject);
    const amount = parseAmountFromText(text);
    const merchant = parseMerchantFromText(text);
    const transactionDate = toDateOnly(payload.received_at || payload.date || nowIso());
    const dedupeKey = dedupeKeyForTransaction({ date: transactionDate, merchant, amount });
    const existingKeys = await collectExistingDedupeKeys(uid);
    const importJobRef = userCollection(uid, COLLECTIONS.importJobs).doc();
    const createdAt = nowIso();
    const duplicate = existingKeys.has(dedupeKey);
    await importJobRef.set({
        id: importJobRef.id,
        user_id: uid,
        source: "forwarded_email",
        status: duplicate ? "processed" : "pending_review",
        file_name: null,
        source_ref: asString(payload.message_id || payload.source_ref || payload.subject),
        imported_count: duplicate ? 0 : 1,
        duplicate_count: duplicate ? 1 : 0,
        error_message: null,
        created_at: createdAt,
        updated_at: createdAt,
    });
    if (!duplicate) {
        const draftRef = userCollection(uid, COLLECTIONS.draftTransactions).doc();
        await draftRef.set({
            id: draftRef.id,
            user_id: uid,
            import_job_id: importJobRef.id,
            source: "forwarded_email",
            transaction_date: transactionDate,
            merchant,
            category: guessCategory(text),
            amount,
            currency: "USD",
            description: text.slice(0, 240),
            dedupe_key: dedupeKey,
            status: "pending",
            raw_payload: payload,
            created_at: createdAt,
            reviewed_at: null,
        });
    }
    await createNotification(uid, {
        type: "receipt",
        title: duplicate ? "Receipt already captured" : "Receipt ready for review",
        body: duplicate
            ? "eva recognized this forwarded receipt as a duplicate and left your history unchanged."
            : "A forwarded receipt was parsed into a draft transaction for your review.",
    });
    return {
        ok: true,
        duplicate,
        import_job_id: importJobRef.id,
    };
}
function guessNewsCategory(result) {
    const text = `${asString(result.title)} ${asString(result.content)}`.toLowerCase();
    if (/crypto|bitcoin|ethereum|solana/.test(text))
        return "Crypto";
    if (/mortgage|housing|rent|real estate/.test(text))
        return "Real Estate";
    if (/inflation|fed|economy|jobs|gdp/.test(text))
        return "Economy";
    if (/budget|saving|credit|debt|retirement/.test(text))
        return "Personal Finance";
    if (/oil|gold|commodity/.test(text))
        return "Commodities";
    if (/policy|regulation|congress|tax/.test(text))
        return "Policy";
    if (/ai|tech|apple|microsoft|google|meta|nvidia/.test(text))
        return "Tech";
    return "Markets";
}
function guessSentiment(text) {
    const normalized = text.toLowerCase();
    if (/surge|gain|beat|rally|upgrade|bull/i.test(normalized))
        return "bullish";
    if (/drop|fall|miss|downgrade|bear|warning/i.test(normalized))
        return "bearish";
    return "neutral";
}
async function callTavily(query, maxResults = 6) {
    const apiKey = process.env.TAVILY_API_KEY;
    if (!apiKey) {
        return [];
    }
    const response = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            api_key: apiKey,
            query,
            search_depth: "advanced",
            max_results: maxResults,
            include_raw_content: false,
        }),
    });
    if (!response.ok) {
        v2_1.logger.warn("Tavily request failed", { status: response.status });
        return [];
    }
    const payload = (await response.json());
    return Array.isArray(payload.results) ? payload.results : [];
}
function extractJson(text) {
    const fenced = text.match(/```json\s*([\s\S]*?)```/i);
    if (fenced) {
        return fenced[1].trim();
    }
    const trimmed = text.trim();
    const firstBrace = trimmed.indexOf("{");
    const lastBrace = trimmed.lastIndexOf("}");
    if (firstBrace >= 0 && lastBrace >= firstBrace) {
        return trimmed.slice(firstBrace, lastBrace + 1);
    }
    return trimmed;
}
async function callGeminiJson(prompt) {
    const apiKey = process.env.GOOGLE_GENAI_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return null;
    }
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {
                temperature: 0.2,
                responseMimeType: "application/json",
            },
        }),
    });
    if (!response.ok) {
        v2_1.logger.warn("Gemini request failed", { status: response.status });
        return null;
    }
    const payload = (await response.json());
    const text = payload.candidates?.[0]?.content?.parts?.map((part) => asString(part.text)).join("\n") || "";
    if (!text.trim()) {
        return null;
    }
    try {
        return JSON.parse(extractJson(text));
    }
    catch (error) {
        v2_1.logger.warn("Failed to parse Gemini JSON response", error);
        return null;
    }
}
async function fetchNewsArticles() {
    const results = await callTavily("latest finance news for personal finance, markets, economy and crypto", 10);
    return results.slice(0, 10).map((result) => ({
        title: asString(result.title) || "Finance update",
        summary: asString(result.content) || asString(result.snippet) || "Live finance coverage from recent sources.",
        source: asString(result.source) || asString(result.url) || "Live source",
        source_url: asString(result.url) || "https://support.useaima.com",
        category: guessNewsCategory(result),
        published_ago: "Recent",
        sentiment: guessSentiment(`${asString(result.title)} ${asString(result.content)}`),
    }));
}
async function buildStockRecommendations() {
    const results = await callTavily("recent analyst upgrades stock watchlist motley fool wall street research high quality companies", 8);
    if (!results.length) {
        return {
            recommendations: [],
            market_pulse: "Live market research is limited right now, so eva is holding back instead of showing weak stock ideas.",
            motley_fool_focus: "",
            summary: "No grounded stock picks available right now.",
        };
    }
    const generated = await callGeminiJson(`
You are EVA, a cautious personal finance copilot. Use only the search results below.
Return strict JSON with keys: market_pulse, motley_fool_focus, summary, recommendations.
recommendations must be an array of at most 3 items. Each item needs:
ticker, company, recommendation (Strong Buy|Buy|Hold), current_price, target_price, upside, reason, source, risk_level (Low|Medium|High), sector.
If the evidence is weak, return an empty recommendations array and explain that in summary.
Search results: ${JSON.stringify(results)}
  `);
    if (generated && Array.isArray(generated.recommendations)) {
        return {
            recommendations: generated.recommendations,
            market_pulse: asString(generated.market_pulse),
            motley_fool_focus: asString(generated.motley_fool_focus),
            summary: asString(generated.summary),
        };
    }
    return {
        recommendations: [],
        market_pulse: "eva found recent market research but could not ground a reliable pick set from it.",
        motley_fool_focus: "",
        summary: "Live market data was too thin or ambiguous for grounded recommendations.",
    };
}
function buildInsightAnalysis(bootstrap, frequency) {
    const spendingEvents = Array.isArray(bootstrap.spending_events) ? bootstrap.spending_events : [];
    const start = frequency === "daily"
        ? new Date(Date.now() - 86_400_000)
        : frequency === "monthly"
            ? new Date(Date.now() - 30 * 86_400_000)
            : new Date(Date.now() - 7 * 86_400_000);
    const relevantEvents = spendingEvents.filter((event) => new Date(toIsoDate(event.date)) >= start);
    const totals = aggregateCategorySpend(relevantEvents, new Date(0));
    const totalSpent = relevantEvents.reduce((sum, event) => sum + asNumber(event.total), 0);
    const topCategories = [...totals.entries()]
        .sort((left, right) => right[1] - left[1])
        .slice(0, 5)
        .map(([category, amount]) => ({
        category,
        amount,
        percentage: totalSpent > 0 ? Math.round((amount / totalSpent) * 100) : 0,
    }));
    const insights = [];
    if (bootstrap.forecast?.status === "overextended") {
        insights.push({
            title: "Month-end cash needs attention",
            description: bootstrap.forecast.summary,
            type: "warning",
            amount: bootstrap.forecast.projected_free_cash,
        });
    }
    if (topCategories[0]) {
        insights.push({
            title: `${topCategories[0].category} leads your recent spending`,
            description: `${topCategories[0].percentage}% of the selected period spend landed in ${topCategories[0].category}.`,
            type: topCategories[0].percentage >= 35 ? "warning" : "tip",
            amount: topCategories[0].amount,
        });
    }
    const healthyBudget = (bootstrap.budget_statuses || []).find((status) => status.status === "healthy");
    if (healthyBudget) {
        insights.push({
            title: `${healthyBudget.category} is under control`,
            description: `You still have ${healthyBudget.remaining_amount.toFixed(0)} left in this budget this month.`,
            type: "positive",
            amount: healthyBudget.remaining_amount,
        });
    }
    if (bootstrap.subscription_review?.flagged_count) {
        insights.push({
            title: "Subscription review opportunity",
            description: bootstrap.subscription_review.summary,
            type: "tip",
            amount: bootstrap.subscription_review.monthly_total,
        });
    }
    return {
        frequency,
        insights: insights.slice(0, 4),
        top_spending_categories: topCategories,
        summary: insights[0]?.description ||
            "eva needs a little more real activity before it can surface deeper spending insights.",
        savings_opportunity: bootstrap.subscription_review?.recommendations?.reduce((sum, item) => sum + asNumber(item.monthly_impact), 0) || 0,
    };
}
function buildFinancialStatement(bootstrap) {
    const profile = bootstrap.profile || defaultProfile(bootstrap.user_id, bootstrap.email);
    const entries = Array.isArray(bootstrap.financial_entries) ? bootstrap.financial_entries : [];
    const subscriptions = Array.isArray(bootstrap.subscriptions) ? bootstrap.subscriptions : [];
    const spendingEvents = Array.isArray(bootstrap.spending_events) ? bootstrap.spending_events : [];
    const incomeItems = entries
        .filter((entry) => entry.entry_type === "asset" && asNumber(entry.cashflow) > 0)
        .map((entry) => ({
        name: asString(entry.name),
        amount: asNumber(entry.cashflow),
        description: asString(entry.description),
    }));
    const expenseTotals = aggregateCategorySpend(spendingEvents, startOfMonth());
    const expenses = [...expenseTotals.entries()].map(([category, amount]) => ({
        name: category,
        amount,
        category,
    }));
    for (const subscription of subscriptions) {
        expenses.push({
            name: asString(subscription.name),
            amount: subscription.billing_cycle === "yearly" ? asNumber(subscription.price) / 12 : asNumber(subscription.price),
            category: asString(subscription.category) || "Subscriptions",
        });
    }
    const assets = entries.filter((entry) => entry.entry_type === "asset").map((entry) => ({
        name: asString(entry.name),
        type: asString(entry.type) || "other",
        value: asNumber(entry.value),
        cashflow: asNumber(entry.cashflow),
        description: asString(entry.description),
    }));
    const liabilities = entries.filter((entry) => entry.entry_type === "liability").map((entry) => ({
        name: asString(entry.name),
        type: asString(entry.type) || "other",
        balance: asNumber(entry.balance),
        payment: asNumber(entry.payment),
        description: asString(entry.description),
    }));
    const passiveIncome = passiveIncomeFromEntries(entries);
    const totalIncome = asNumber(profile.monthly_income) + passiveIncome + incomeItems.reduce((sum, item) => sum + item.amount, 0);
    const totalExpenses = asNumber(profile.monthly_fixed_expenses) +
        expenses.reduce((sum, expense) => sum + expense.amount, 0) +
        liabilities.reduce((sum, liability) => sum + liability.payment, 0);
    return {
        income: {
            salary: asNumber(profile.monthly_income),
            items: incomeItems,
        },
        expenses,
        assets,
        liabilities,
        passive_income: passiveIncome,
        total_income: totalIncome,
        total_expenses: totalExpenses,
        monthly_cashflow: totalIncome - totalExpenses,
        summary: totalIncome - totalExpenses >= 0
            ? "Your current statement shows positive monthly cash flow, but keep logging real spending so this stays grounded."
            : "Your current statement shows negative monthly cash flow, so the next best move is to trim recurring costs or raise available income.",
    };
}
function createStreamChunk(content) {
    return JSON.stringify({ choices: [{ delta: { content } }] });
}
function streamSse(res, payload) {
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
}
function streamText(res, text) {
    const chunks = text.match(/.{1,120}(\s|$)/g) || [text];
    for (const chunk of chunks) {
        res.write(`data: ${createStreamChunk(chunk)}\n\n`);
    }
    res.write("data: [DONE]\n\n");
    res.end();
}
function parseSpendingMessage(message) {
    const segments = message
        .split(/\band\b|,/i)
        .map((segment) => segment.trim())
        .filter(Boolean);
    const items = segments
        .map((segment, index) => {
        const amount = parseAmountFromText(segment);
        if (!amount) {
            return null;
        }
        const descriptionMatch = segment.match(/(?:for|on|at)\s+([A-Za-z0-9&' .-]{2,60})/i);
        const description = descriptionMatch?.[1]?.trim() || `Expense ${index + 1}`;
        return {
            category: guessCategory(description),
            amount,
            description,
        };
    })
        .filter(Boolean);
    if (!items.length || !/(spent|paid|bought|expense|cost|\$|usd)/i.test(message)) {
        return null;
    }
    const total = items.reduce((sum, item) => sum + item.amount, 0);
    return {
        items,
        total,
        score: Math.min(0.99, items.length * 0.25 + 0.5),
    };
}
async function logChatSpending(uid, rawInput, parsed) {
    const eventRef = userCollection(uid, COLLECTIONS.spendingEvents).doc();
    const primaryDescription = parsed.items?.[0]?.description || rawInput;
    const dedupeKey = dedupeKeyForTransaction({
        date: toDateOnly(nowIso()),
        merchant: primaryDescription,
        amount: asNumber(parsed.total),
    });
    await eventRef.set({
        id: eventRef.id,
        user_id: uid,
        date: toDateOnly(nowIso()),
        items: parsed.items,
        raw_input: rawInput,
        total: asNumber(parsed.total),
        source: "chat",
        dedupe_key: dedupeKey,
        created_at: nowIso(),
    });
    await createNotification(uid, {
        type: "chat_log",
        title: "New spending logged",
        body: `eva logged ${parsed.total.toFixed(2)} from chat into your canonical spending history.`,
    });
}
function helpLink(articleId) {
    return `${SUPPORT_BASE_URL}/${articleId}`;
}
function buildChatReply(message, bootstrap, parsedSpending, affordability) {
    if (parsedSpending) {
        const latestBudgetWarning = (bootstrap.budget_statuses || []).find((status) => status.status !== "healthy");
        return `${parsedSpending.items.length === 1 ? "Logged it." : "Logged those expenses."} I added ${parsedSpending.items.length} spending item${parsedSpending.items.length === 1 ? "" : "s"} for a total of ${parsedSpending.total.toFixed(2)}. ${latestBudgetWarning ? `${latestBudgetWarning.category} is now ${latestBudgetWarning.status === "over" ? "over budget" : "close to the monthly limit"}. ` : ""}You can review the canonical record in Spending History or keep logging from chat.`;
    }
    if (affordability) {
        return `Based on your current forecast, this looks ${affordability.status === "comfortable" ? "comfortable" : affordability.status === "tight" ? "possible but tight" : affordability.status === "not_now" ? "not ideal right now" : "too early to judge with confidence"}. ${affordability.summary}`;
    }
    if (!bootstrap.empty_flags?.has_spending_history) {
        return `I can help, but I need a little real activity first. Log a recent expense like “I spent 24 on lunch and 12 on transport,” and I’ll ground the advice in your actual records.`;
    }
    return `Right now your month-end forecast looks ${bootstrap.forecast?.status === "overextended" ? "stretched" : "manageable"}. ${bootstrap.forecast?.summary || "Keep logging real spending so I can stay grounded."} If you want, tell me about a purchase and I’ll log it or help you check affordability.`;
}
async function runScheduledSummaryPass(period) {
    const users = await db.collection("users").get();
    let processed = 0;
    for (const userSnapshot of users.docs) {
        const uid = userSnapshot.id;
        const profile = sanitize(userSnapshot.data());
        if (!profile.onboarding_completed) {
            continue;
        }
        const bootstrap = await buildBootstrap(uid, asNullableString(profile.email));
        const summary = buildSummaryResult(period, bootstrap.spending_events || []);
        const docId = `${period}-${toDateOnly(nowIso())}`;
        await userCollection(uid, COLLECTIONS.summaries).doc(docId).set({
            id: docId,
            user_id: uid,
            ...summary,
            created_at: nowIso(),
            updated_at: nowIso(),
        });
        await createNotification(uid, {
            type: `${period}_summary`,
            title: period === "daily" ? "Daily summary ready" : "Weekly summary ready",
            body: summary.headline,
        });
        processed += 1;
    }
    return { processed, period };
}
exports.financeCore = (0, https_1.onRequest)(httpOptions, async (req, res) => {
    try {
        const user = await requireUser(req);
        const body = (req.body && typeof req.body === "object" ? req.body : {});
        const action = asString(body.action) || "bootstrap";
        if (action === "bootstrap") {
            return respondJson(res, 200, await buildBootstrap(user.uid, user.email));
        }
        if (action === "complete_onboarding") {
            await replaceOnboardingData(user.uid, user.email, body);
            return respondJson(res, 200, await buildBootstrap(user.uid, user.email));
        }
        if (action === "update_profile") {
            await saveProfile(user.uid, user.email, body.profile || {}, true);
            return respondJson(res, 200, await buildBootstrap(user.uid, user.email));
        }
        if (action === "save_goal") {
            await saveCollectionDoc(user.uid, COLLECTIONS.goals, body.goal || {});
            return respondJson(res, 200, await buildBootstrap(user.uid, user.email));
        }
        if (action === "delete_goal") {
            await deleteCollectionDoc(user.uid, COLLECTIONS.goals, asString(body.goal_id));
            return respondJson(res, 200, await buildBootstrap(user.uid, user.email));
        }
        if (action === "save_budget_limit") {
            await saveCollectionDoc(user.uid, COLLECTIONS.budgetLimits, body.budget_limit || {});
            return respondJson(res, 200, await buildBootstrap(user.uid, user.email));
        }
        if (action === "delete_budget_limit") {
            await deleteCollectionDoc(user.uid, COLLECTIONS.budgetLimits, asString(body.budget_limit_id));
            return respondJson(res, 200, await buildBootstrap(user.uid, user.email));
        }
        if (action === "save_subscription") {
            await saveCollectionDoc(user.uid, COLLECTIONS.subscriptions, body.subscription || {});
            return respondJson(res, 200, await buildBootstrap(user.uid, user.email));
        }
        if (action === "delete_subscription") {
            await deleteCollectionDoc(user.uid, COLLECTIONS.subscriptions, asString(body.subscription_id));
            return respondJson(res, 200, await buildBootstrap(user.uid, user.email));
        }
        if (action === "save_financial_entry") {
            await saveCollectionDoc(user.uid, COLLECTIONS.financialEntries, body.financial_entry || {});
            return respondJson(res, 200, await buildBootstrap(user.uid, user.email));
        }
        if (action === "delete_financial_entry") {
            await deleteCollectionDoc(user.uid, COLLECTIONS.financialEntries, asString(body.financial_entry_id));
            return respondJson(res, 200, await buildBootstrap(user.uid, user.email));
        }
        if (action === "check_affordability") {
            const bootstrap = await buildBootstrap(user.uid, user.email);
            return respondJson(res, 200, buildAffordabilityResult(body, bootstrap));
        }
        if (action === "import_csv_transactions") {
            await importCsvTransactions(user.uid, asString(body.csv_text), asNullableString(body.file_name));
            return respondJson(res, 200, await buildBootstrap(user.uid, user.email));
        }
        if (action === "review_draft_transaction") {
            await reviewDraftTransaction(user.uid, {
                draftId: body.draft_transaction_id,
                decision: body.decision,
                updates: body.updates,
            });
            return respondJson(res, 200, await buildBootstrap(user.uid, user.email));
        }
        if (action === "mark_notification_read") {
            const notificationId = asString(body.notification_id);
            await userCollection(user.uid, COLLECTIONS.notifications).doc(notificationId).set({
                is_read: true,
                updated_at: nowIso(),
            }, { merge: true });
            return respondJson(res, 200, await buildBootstrap(user.uid, user.email));
        }
        return respondJson(res, 400, { error: `Unsupported financeCore action: ${action}` });
    }
    catch (error) {
        return respondError(res, 401, error instanceof Error ? error.message : "Unauthorized request.", error);
    }
});
exports.generateStatement = (0, https_1.onRequest)(httpOptions, async (req, res) => {
    try {
        const user = await requireUser(req);
        const bootstrap = await buildBootstrap(user.uid, user.email);
        return respondJson(res, 200, buildFinancialStatement(bootstrap));
    }
    catch (error) {
        return respondError(res, 401, error instanceof Error ? error.message : "Unable to generate statement.", error);
    }
});
exports.generateInsights = (0, https_1.onRequest)(httpOptions, async (req, res) => {
    try {
        const user = await requireUser(req);
        const frequency = asString((req.body || {}).frequency) || "weekly";
        const bootstrap = await buildBootstrap(user.uid, user.email);
        return respondJson(res, 200, buildInsightAnalysis(bootstrap, frequency));
    }
    catch (error) {
        return respondError(res, 401, error instanceof Error ? error.message : "Unable to generate insights.", error);
    }
});
exports.fetchFinanceNews = (0, https_1.onRequest)(httpOptions, async (_req, res) => {
    try {
        const articles = await fetchNewsArticles();
        return respondJson(res, 200, { articles });
    }
    catch (error) {
        return respondError(res, 500, "Unable to fetch finance news right now.", error);
    }
});
exports.stockRecommendations = (0, https_1.onRequest)(httpOptions, async (_req, res) => {
    try {
        return respondJson(res, 200, await buildStockRecommendations());
    }
    catch (error) {
        return respondError(res, 500, "Unable to fetch stock recommendations right now.", error);
    }
});
exports.chat = (0, https_1.onRequest)(httpOptions, async (req, res) => {
    try {
        const user = await requireUser(req);
        const body = (req.body && typeof req.body === "object" ? req.body : {});
        const messages = Array.isArray(body.messages) ? body.messages : [];
        const lastMessage = [...messages].reverse().find((message) => message?.role === "user");
        const messageText = asString(lastMessage?.content);
        const parsedSpending = parseSpendingMessage(messageText);
        if (parsedSpending) {
            await logChatSpending(user.uid, messageText, parsedSpending);
        }
        const bootstrap = await buildBootstrap(user.uid, user.email);
        const affordability = /afford/i.test(messageText)
            ? buildAffordabilityResult({ amount: parseAmountFromText(messageText), cadence: /monthly/i.test(messageText) ? "monthly" : "one_time" }, bootstrap)
            : null;
        const reply = buildChatReply(messageText, bootstrap, parsedSpending, affordability);
        res.status(200);
        res.set({
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
            "X-Accel-Buffering": "no",
        });
        res.flushHeaders?.();
        if (parsedSpending) {
            streamSse(res, {
                type: "spending_parsed",
                ...parsedSpending,
            });
        }
        streamText(res, reply);
    }
    catch (error) {
        return respondError(res, 401, error instanceof Error ? error.message : "Unable to stream chat.", error);
    }
});
exports.receiptIngress = (0, https_1.onRequest)(httpOptions, async (req, res) => {
    try {
        const sharedSecret = process.env.RECEIPT_INGRESS_SECRET;
        const receivedSecret = String(req.headers["x-eva-receipt-secret"] || "");
        if (sharedSecret && receivedSecret !== sharedSecret) {
            return respondError(res, 403, "Invalid receipt ingress secret.");
        }
        return respondJson(res, 200, await ingestForwardedReceipt((req.body || {})));
    }
    catch (error) {
        return respondError(res, 400, error instanceof Error ? error.message : "Unable to ingest receipt.", error);
    }
});
exports.scheduledSummaries = (0, https_1.onRequest)(httpOptions, async (req, res) => {
    try {
        const sharedSecret = process.env.SCHEDULED_SUMMARIES_SECRET;
        const receivedSecret = String(req.headers["x-eva-scheduler-secret"] || "");
        if (sharedSecret && receivedSecret !== sharedSecret) {
            return respondError(res, 403, "Invalid scheduled summary secret.");
        }
        const period = (asString((req.body || {}).period) || "daily");
        return respondJson(res, 200, await runScheduledSummaryPass(period));
    }
    catch (error) {
        return respondError(res, 500, "Unable to run scheduled summaries.", error);
    }
});
exports.scheduledSummariesDaily = (0, scheduler_1.onSchedule)({
    schedule: "0 7 * * *",
    timeZone: "Africa/Nairobi",
}, async () => {
    await runScheduledSummaryPass("daily");
});
exports.scheduledSummariesWeekly = (0, scheduler_1.onSchedule)({
    schedule: "0 8 * * MON",
    timeZone: "Africa/Nairobi",
}, async () => {
    await runScheduledSummaryPass("weekly");
});
