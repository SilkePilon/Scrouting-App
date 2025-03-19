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
      <DialogContent className="w-[320px] sm:w-auto rounded-lg">
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