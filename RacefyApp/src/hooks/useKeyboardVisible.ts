import { useEffect, useState } from 'react';
import { Keyboard } from 'react-native';

export function useKeyboardVisible(): boolean {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const subs = [
      Keyboard.addListener('keyboardWillShow', () => setVisible(true)),
      Keyboard.addListener('keyboardWillHide', () => setVisible(false)),
      Keyboard.addListener('keyboardDidShow', () => setVisible(true)),
      Keyboard.addListener('keyboardDidHide', () => setVisible(false)),
    ];

    return () => subs.forEach((s) => s.remove());
  }, []);

  return visible;
}
