import * as Sentry from '@sentry/react';
import { Button } from '@/components/ui/button';

export function ErrorButton() {
  return (
    <Button
      variant="destructive"
      onClick={() => {
        throw new Error('This is your first error!');
      }}
    >
      Break the world
    </Button>
  );
}
