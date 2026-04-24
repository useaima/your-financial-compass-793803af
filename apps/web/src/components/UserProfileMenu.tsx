import { useMemo, useState } from "react";
import { format } from "date-fns";
import {
  Bell,
  ChevronDown,
  CircleHelp,
  CreditCard,
  LogOut,
  MessageCircle,
  MoonStar,
  UserRound,
  Wallet,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import UserAvatar from "@/components/UserAvatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePublicUser } from "@/context/PublicUserContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { getAuthProfileSeed } from "@/lib/authProfile";
import { buildSettingsHref, type SettingsSection } from "@/lib/appPreferences";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

type UserProfileMenuProps = {
  compact?: boolean;
  className?: string;
  contentClassName?: string;
};

function getDisplayName({
  firstName,
  lastName,
  fullName,
  email,
}: {
  firstName: string;
  lastName: string;
  fullName: string;
  email: string | null;
}) {
  const trimmed = [firstName, lastName].filter(Boolean).join(" ").trim();
  if (trimmed) {
    return trimmed;
  }

  if (fullName.trim()) {
    return fullName.trim();
  }

  if (email) {
    return email.split("@")[0] ?? "eva user";
  }

  return "eva user";
}

export default function UserProfileMenu({
  compact = false,
  className,
  contentClassName,
}: UserProfileMenuProps) {
  const navigate = useNavigate();
  const { bootstrap, signOut, user } = usePublicUser();
  const isMobile = useIsMobile();
  const [mobileOpen, setMobileOpen] = useState(false);

  const authSeed = useMemo(() => getAuthProfileSeed(user), [user]);
  const profile = bootstrap.profile;
  const displayName = getDisplayName({
    firstName: profile?.first_name ?? authSeed.first_name,
    lastName: profile?.last_name ?? authSeed.last_name,
    fullName: authSeed.full_name,
    email: user?.email ?? bootstrap.email,
  });
  const userEmail = user?.email ?? bootstrap.email ?? "Signed in user";
  const avatarSeed = user?.id ?? bootstrap.user_id ?? userEmail;
  const memberSince = useMemo(() => {
    if (!profile?.created_at) {
      return "Your eva workspace";
    }

    const parsed = new Date(profile.created_at);
    if (Number.isNaN(parsed.getTime())) {
      return "Your eva workspace";
    }

    return `Member since ${format(parsed, "MMM yyyy")}`;
  }, [profile?.created_at]);

  const navigateToSettings = (section: SettingsSection) => {
    setMobileOpen(false);
    navigate(buildSettingsHref(section));
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success("Signed out successfully.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to sign out right now.");
    }
  };

  const profileLinks: Array<{ label: string; icon: typeof UserRound; section: SettingsSection }> = [
    { label: "Profile", icon: UserRound, section: "profile" },
    { label: "Account", icon: Wallet, section: "account" },
    { label: "Notifications", icon: Bell, section: "notifications" },
    { label: "Billing", icon: CreditCard, section: "billing" },
    { label: "Settings", icon: MoonStar, section: "settings" },
    { label: "Help & Support", icon: CircleHelp, section: "help" },
    { label: "Feedback", icon: MessageCircle, section: "feedback" },
  ];

  const trigger = compact ? (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      data-testid="profile-menu-trigger"
      className={cn(
        "h-11 w-11 rounded-full border border-border/80 bg-card/90 p-0 shadow-[0_14px_28px_-22px_rgba(110,73,75,0.3)]",
        className,
      )}
      aria-label="Open profile menu"
    >
      <UserAvatar
        seed={avatarSeed}
        name={displayName}
        email={userEmail}
        className="h-10 w-10 border-0 shadow-none"
      />
    </Button>
  ) : (
    <button
      type="button"
      data-testid="profile-menu-trigger"
      className={cn(
        "flex w-full items-center gap-3 rounded-[1.25rem] border border-border/80 bg-card/90 px-3 py-3 text-left shadow-[0_18px_40px_-34px_rgba(110,73,75,0.18)] transition-colors hover:border-primary/35 hover:bg-secondary/60",
        className,
      )}
      aria-label="Open profile menu"
    >
      <UserAvatar seed={avatarSeed} name={displayName} email={userEmail} className="h-11 w-11" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{displayName}</p>
        <p className="truncate text-xs text-muted-foreground">{userEmail}</p>
      </div>
      <ChevronDown className="h-4 w-4 text-muted-foreground" />
    </button>
  );

  if (compact && isMobile) {
    return (
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger asChild>
          {trigger}
        </SheetTrigger>
        <SheetContent
          side="right"
          className={cn(
            "w-[92vw] max-w-sm overflow-y-auto border-l border-border bg-card px-0 pb-6 pt-8",
            contentClassName,
          )}
        >
          <SheetHeader className="px-5 text-left">
            <div className="flex items-center gap-3 rounded-2xl border border-border bg-muted/70 p-4">
              <UserAvatar seed={avatarSeed} name={displayName} email={userEmail} className="h-12 w-12" />
              <div className="min-w-0">
                <SheetTitle className="truncate text-base">{displayName}</SheetTitle>
                <SheetDescription className="truncate text-xs">{userEmail}</SheetDescription>
                <p className="mt-1 text-[0.72rem] uppercase tracking-[0.16em] text-muted-foreground">
                  {memberSince}
                </p>
              </div>
            </div>
          </SheetHeader>

          <div className="mt-6 space-y-2 px-4">
            {profileLinks.map((item) => (
              <button
                key={item.section}
                type="button"
                data-testid={`profile-menu-${item.section}`}
                className="flex w-full items-center gap-3 rounded-2xl border border-border/80 bg-background/80 px-4 py-3 text-left text-sm font-medium text-foreground transition-colors hover:border-primary/30 hover:bg-secondary/60"
                onClick={() => navigateToSettings(item.section)}
              >
                <item.icon className="h-4 w-4 text-muted-foreground" />
                <span>{item.label}</span>
              </button>
            ))}
          </div>

          <div className="mt-6 border-t border-border/80 px-4 pt-4">
            <button
              type="button"
              data-testid="profile-menu-signout"
              className="flex w-full items-center gap-3 rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-left text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
              onClick={() => {
                setMobileOpen(false);
                void handleSignOut();
              }}
            >
              <LogOut className="h-4 w-4" />
              <span>Sign out</span>
            </button>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {trigger}
      </DropdownMenuTrigger>

      <DropdownMenuContent
        data-testid="profile-menu-content"
        align="end"
        sideOffset={12}
        className={cn(
          "w-[19rem] rounded-2xl border border-border bg-card p-2 text-popover-foreground shadow-[0_32px_80px_-46px_rgba(24,28,16,0.42)] ring-1 ring-border/60",
          contentClassName,
        )}
      >
        <DropdownMenuLabel className="rounded-xl border border-border bg-muted p-3">
          <div className="flex items-center gap-3">
            <UserAvatar seed={avatarSeed} name={displayName} email={userEmail} className="h-12 w-12" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">{displayName}</p>
              <p className="truncate text-xs font-normal text-muted-foreground">{userEmail}</p>
              <p className="mt-1 text-[0.72rem] font-normal uppercase tracking-[0.16em] text-muted-foreground">
                {memberSince}
              </p>
            </div>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuGroup>
          {profileLinks.map((item) => (
            <DropdownMenuItem
              key={item.section}
              data-testid={`profile-menu-${item.section}`}
              className="mt-1 rounded-xl px-3 py-2.5"
              onSelect={(event) => {
                event.preventDefault();
                navigateToSettings(item.section);
              }}
            >
              <item.icon className="mr-2 h-4 w-4" />
              {item.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>

        <DropdownMenuSeparator className="my-2" />
        <DropdownMenuItem
          data-testid="profile-menu-signout"
          className="rounded-xl px-3 py-2.5 text-destructive focus:bg-destructive/10 focus:text-destructive"
          onSelect={(event) => {
            event.preventDefault();
            void handleSignOut();
          }}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
