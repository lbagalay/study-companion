export type NotificationStatus = {
  detail: string;
  permission: 'default' | 'denied' | 'granted' | 'unsupported';
  requiresInstall: boolean;
  subscribed: boolean;
  supported: boolean;
};
