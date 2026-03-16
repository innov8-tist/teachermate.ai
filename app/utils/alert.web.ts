// Web-compatible Alert utility
export const Alert = {
  alert: (
    title: string,
    message?: string,
    buttons?: Array<{
      text: string;
      onPress?: () => void;
      style?: 'default' | 'cancel' | 'destructive';
    }>
  ) => {
    console.log('🔔 Web Alert called:', { title, message, buttons });
    const fullMessage = message ? `${title}\n\n${message}` : title;
    
    if (!buttons || buttons.length === 0) {
      console.log('🔔 Showing simple alert');
      window.alert(fullMessage);
      return;
    }

    if (buttons.length === 1) {
      console.log('🔔 Showing single button alert');
      window.alert(fullMessage);
      buttons[0].onPress?.();
      return;
    }

    // For multiple buttons, use confirm dialog
    console.log('🔔 Showing confirm dialog');
    const result = window.confirm(fullMessage);
    console.log('🔔 User response:', result);
    
    if (result) {
      // Find the non-cancel button (usually the destructive/confirm button)
      const confirmButton = buttons.find(b => b.style !== 'cancel');
      console.log('🔔 Calling confirm button:', confirmButton);
      confirmButton?.onPress?.();
    } else {
      // Find the cancel button
      const cancelButton = buttons.find(b => b.style === 'cancel');
      console.log('🔔 Calling cancel button:', cancelButton);
      cancelButton?.onPress?.();
    }
  }
};
