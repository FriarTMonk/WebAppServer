export type NotificationPermissionStatus = 'granted' | 'denied' | 'default';

export interface NotificationOptions {
  title: string;
  body: string;
  tag?: string;
  requireInteraction?: boolean;
  icon?: string;
  badge?: string;
  data?: any;
  onClick?: () => void;
}

export class BrowserNotifications {
  static isSupported(): boolean {
    return 'Notification' in window;
  }

  static getPermission(): NotificationPermissionStatus {
    if (!this.isSupported()) return 'denied';
    return Notification.permission as NotificationPermissionStatus;
  }

  static async requestPermission(): Promise<NotificationPermissionStatus> {
    if (!this.isSupported()) {
      throw new Error('Browser notifications are not supported');
    }

    const permission = await Notification.requestPermission();
    return permission as NotificationPermissionStatus;
  }

  static send(options: NotificationOptions): Notification | null {
    if (!this.isSupported() || this.getPermission() !== 'granted') {
      return null;
    }

    const notification = new Notification(options.title, {
      body: options.body,
      icon: options.icon || '/favicon.ico',
      badge: options.badge || '/badge-icon.png',
      tag: options.tag,
      requireInteraction: options.requireInteraction || false,
      data: options.data,
    });

    if (options.onClick) {
      notification.onclick = () => {
        window.focus();
        options.onClick?.();
        notification.close();
      };
    }

    return notification;
  }

  static sendQueueAlert(
    type: 'failure_spike' | 'stalled' | 'max_retries' | 'paused',
    data: any
  ): void {
    const notificationConfigs = {
      failure_spike: {
        title: 'Queue Alert: Multiple Failures',
        body: `${data.count}+ evaluations failed in the last 5 minutes`,
        tag: 'queue-failure-spike',
        requireInteraction: true,
      },
      stalled: {
        title: 'Queue Alert: Processing Stalled',
        body: 'Queue has been idle for 15 minutes with pending jobs',
        tag: 'queue-stalled',
        requireInteraction: true,
      },
      max_retries: {
        title: 'Evaluation Failed (Max Retries)',
        body: `Book evaluation ${data.jobId} failed after 3 attempts`,
        tag: 'queue-max-retries',
        requireInteraction: false,
      },
      paused: {
        title: 'Queue Paused by Admin',
        body: `Evaluation queue paused by ${data.adminName || 'another admin'}`,
        tag: 'queue-paused',
        requireInteraction: false,
      },
    };

    const config = notificationConfigs[type];
    if (!config) return;

    this.send({
      ...config,
      data: { type, ...data },
      onClick: () => {
        // Focus tab and scroll to relevant section
        const element = document.getElementById('queue-status');
        element?.scrollIntoView({ behavior: 'smooth' });
      },
    });
  }
}
