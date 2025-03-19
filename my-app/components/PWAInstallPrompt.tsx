"use client";
import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function PWAInstallPrompt() {
  const [isOpen, setIsOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      // Check if user previously clicked "Maybe Later"
      const hasDeclined = localStorage.getItem('pwa-prompt-declined');
      if (!hasDeclined) {
        setDeferredPrompt(e);
        setIsOpen(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
    setIsOpen(false);
  };

  const handleDecline = () => {
    localStorage.setItem('pwa-prompt-declined', 'true');
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-[90%] w-[320px] sm:max-w-[425px] rounded-lg">
        <DialogHeader>
          <DialogTitle>Install Our App</DialogTitle>
          <DialogDescription>
            Install our app on your phone for a better experience and quick access!
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end space-x-4 mt-4">
          <Button variant="outline" onClick={handleDecline}>
            Maybe Later
          </Button>
          <Button onClick={handleInstall}>
            Install Now
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}