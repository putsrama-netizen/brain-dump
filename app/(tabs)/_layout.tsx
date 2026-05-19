import React from 'react';
import { Tabs } from 'expo-router';
import { Feather, LayoutGrid, CheckSquare } from 'lucide-react-native';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.sageDeep,
        tabBarInactiveTintColor: colors.slateMut,
        tabBarStyle: {
          backgroundColor: colors.paper,
          borderTopColor: colors.divider,
          borderTopWidth: 1,
          paddingTop: 6,
          height: 84,
        },
        tabBarLabelStyle: {
          ...typography.caption,
          fontWeight: '500',
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dump',
          tabBarIcon: ({ color, size }) => <Feather size={size} color={color} strokeWidth={1.6} />,
        }}
      />
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => <LayoutGrid size={size} color={color} strokeWidth={1.6} />,
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: 'Focus',
          tabBarIcon: ({ color, size }) => <CheckSquare size={size} color={color} strokeWidth={1.6} />,
        }}
      />
    </Tabs>
  );
}
