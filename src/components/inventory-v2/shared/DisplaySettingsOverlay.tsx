import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../../ui/sheet';
import { Switch } from '../../ui/switch';
import { Label } from '../../ui/label';
import { useInventoryV2 } from '../InventoryV2Context';
import { Settings } from 'lucide-react';

interface DisplaySettingsOverlayProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function DisplaySettingsOverlay({ open, onOpenChange }: DisplaySettingsOverlayProps) {
  const { state, dispatch } = useInventoryV2();
  const { displaySettings } = state;

  const updateSetting = (key: keyof typeof displaySettings, value: boolean) => {
    dispatch({
      type: 'SET_DISPLAY_SETTINGS',
      payload: { ...displaySettings, [key]: value },
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary" />
            Display Settings
          </SheetTitle>
        </SheetHeader>
        <div className="space-y-6 mt-6">
          <div className="flex items-center justify-between">
            <Label htmlFor="hide-names" className="flex flex-col gap-1">
              <span className="font-medium">Hide item names on phone</span>
              <span className="text-xs text-muted-foreground">
                Hides item names on small screens for a compact view
              </span>
            </Label>
            <Switch
              id="hide-names"
              checked={displaySettings.hideItemNamesOnPhone}
              onCheckedChange={(checked: boolean) => updateSetting('hideItemNamesOnPhone', checked)}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="hide-desc" className="flex flex-col gap-1">
              <span className="font-medium">Hide item descriptions</span>
              <span className="text-xs text-muted-foreground">
                Removes description text from item rows
              </span>
            </Label>
            <Switch
              id="hide-desc"
              checked={displaySettings.hideDescriptions}
              onCheckedChange={(checked: boolean) => updateSetting('hideDescriptions', checked)}
            />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
