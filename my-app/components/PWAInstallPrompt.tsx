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
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();

      // Check if user has previously declined within the past day
      const lastDeclined = localStorage.getItem('pwaPromptDeclined');
      if (lastDeclined) {
        const lastDeclinedDate = new Date(parseInt(lastDeclined));
        const now = new Date();
        const dayInMilliseconds = 24 * 60 * 60 * 1000;
        
        // If it's been less than a day since declining, don't show the prompt
        if (now.getTime() - lastDeclinedDate.getTime() < dayInMilliseconds) {
          return;
        }
      }

      setDeferredPrompt(e);
      setIsOpen(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
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
    // Save the current timestamp when user declines
    localStorage.setItem('pwaPromptDeclined', Date.now().toString());
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="w-[90%] max-w-md mx-auto rounded-xl">
        <DialogHeader>
          <DialogTitle>Installeer Onze App</DialogTitle>
          <DialogDescription>
            Installeer onze app op je telefoon voor een betere ervaring en snelle toegang!
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end space-x-4 mt-4">
          <Button variant="outline" onClick={handleDecline}>
            Misschien Later
          </Button>
          <Button onClick={handleInstall}>
            Nu Installeren
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}