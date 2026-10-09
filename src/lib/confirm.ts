import { Alert, Platform } from 'react-native';

/** Yes/no dialog that also works on web (react-native-web's Alert has no buttons). */
export function confirm(opts: {
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
}): Promise<boolean> {
  if (Platform.OS === 'web') {
    return Promise.resolve(
      globalThis.confirm?.([opts.title, opts.message].filter(Boolean).join('\n\n')) ?? false,
    );
  }
  return new Promise((resolve) => {
    Alert.alert(
      opts.title,
      opts.message,
      [
        { text: opts.cancelText ?? 'Cancel', style: 'cancel', onPress: () => resolve(false) },
        {
          text: opts.confirmText ?? 'OK',
          style: opts.destructive ? 'destructive' : 'default',
          onPress: () => resolve(true),
        },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}

/** Simple notice. */
export function notify(title: string, message?: string) {
  if (Platform.OS === 'web') globalThis.alert?.([title, message].filter(Boolean).join('\n\n'));
  else Alert.alert(title, message);
}
