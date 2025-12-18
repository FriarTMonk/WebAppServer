export interface PostmarkInboundDto {
  FromFull: {
    Email: string;
    Name: string;
  };
  ToFull: Array<{
    Email: string;
    Name: string;
  }>;
  Subject: string;
  TextBody: string;
  HtmlBody: string;
  StrippedTextReply?: string;
  MessageID: string;
  Date: string;
  Attachments?: Array<{
    Name: string;
    Content: string; // Base64 encoded
    ContentType: string;
    ContentLength: number;
  }>;
}
