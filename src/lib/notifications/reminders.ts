// Web and test fallback. Metro selects reminders.native.ts on iOS and Android.
export function configureNotifications() {}
export async function requestNotificationPermission() { return false; }
export async function cancelNotifications(_ids: readonly string[]) {}
export async function cancelAllNotifications() {}
export async function scheduleReminders(_title: string, _body: string, _eventAt: string, _offsets: readonly number[]) { return [] as string[]; }
export async function scheduleExamReminders(_title: string, _eventAt: string, _offsets: readonly number[]) { return [] as string[]; }
