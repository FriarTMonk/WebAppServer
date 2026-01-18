/**
 * Postmark webhook DTOs for email tracking events
 * Based on Postmark's webhook documentation:
 * https://postmarkapp.com/developer/webhooks/webhooks-overview
 */

/**
 * Base interface for all Postmark tracking webhooks
 */
export interface PostmarkTrackingWebhookDto {
  RecordType: 'Delivery' | 'Bounce' | 'Open' | 'Click';
  MessageID: string; // Postmark's unique message ID
  Recipient: string; // Email address
  Tag?: string;
  Metadata?: Record<string, any>;
  DeliveredAt?: string; // ISO 8601 timestamp
  BouncedAt?: string;
  Details?: string;
  Email?: string;
  From?: string;
  Subject?: string;
}

/**
 * Delivery event - email successfully delivered to recipient's mail server
 */
export interface PostmarkDeliveryWebhookDto extends PostmarkTrackingWebhookDto {
  RecordType: 'Delivery';
  DeliveredAt: string;
  ServerID: number;
}

/**
 * Bounce event - email bounced (hard or soft bounce)
 */
export interface PostmarkBounceWebhookDto extends PostmarkTrackingWebhookDto {
  RecordType: 'Bounce';
  Type: 'HardBounce' | 'SoftBounce' | 'Transient' | 'Blocked' | 'AutoResponder' | 'AddressChange' | 'DnsError' | 'SpamNotification' | 'OpenRelayTest' | 'Unknown' | 'VirusNotification';
  TypeCode: number;
  Name: string;
  Description: string;
  Details: string;
  BouncedAt: string;
  Inactive: boolean;
  CanActivate: boolean;
  Content?: string;
}

/**
 * Open event - recipient opened the email
 */
export interface PostmarkOpenWebhookDto extends PostmarkTrackingWebhookDto {
  RecordType: 'Open';
  FirstOpen: boolean; // True if this is the first time opened
  ReceivedAt: string;
  UserAgent?: string;
  OS?: {
    Name: string;
    Version: string;
    Family: string;
  };
  Client?: {
    Name: string;
    Version: string;
    Family: string;
  };
  Platform?: string;
  Geo?: {
    CountryISOCode: string;
    Country: string;
    RegionISOCode: string;
    Region: string;
    City: string;
    Zip: string;
    Coords: string;
    IP: string;
  };
}

/**
 * Click event - recipient clicked a link in the email
 */
export interface PostmarkClickWebhookDto extends PostmarkTrackingWebhookDto {
  RecordType: 'Click';
  ClickLocation: string; // URL that was clicked
  ReceivedAt: string;
  UserAgent?: string;
  OS?: {
    Name: string;
    Version: string;
    Family: string;
  };
  Client?: {
    Name: string;
    Version: string;
    Family: string;
  };
  Platform?: string;
  Geo?: {
    CountryISOCode: string;
    Country: string;
    RegionISOCode: string;
    Region: string;
    City: string;
    Zip: string;
    Coords: string;
    IP: string;
  };
}
