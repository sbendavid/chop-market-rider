import { Tabs } from 'expo-router';

import { Icon, type IconName } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';

/** Web is a development preview only: classic bottom tabs (native tabs render as a top bar). */
const TABS: { name: string; title: string; icon: IconName }[] = [
  { name: 'index', title: 'Jobs', icon: 'rider' },
  { name: 'earnings', title: 'Earnings', icon: 'earnings' },
  { name: 'account', title: 'Account', icon: 'account' },
];

export default function TabsLayout() {
  const theme = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarStyle: { backgroundColor: theme.background, borderTopColor: theme.border },
      }}>
      {TABS.map((t) => (
        <Tabs.Screen
          key={t.name}
          name={t.name}
          options={{
            title: t.title,
            tabBarIcon: ({ focused }) => (
              <Icon name={t.icon} size={22} color={focused ? 'primary' : 'textSecondary'} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
