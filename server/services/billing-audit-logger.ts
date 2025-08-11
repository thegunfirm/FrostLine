import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

export interface BillingAuditEvent {
  timestamp: string; // ISO-8601 UTC
  type: 'net.authorize.customer.subscription.failed' | 
        'net.authorize.customer.subscription.suspended' | 
        'net.authorize.customer.subscription.updated' | 
        'email.sent' | 
        'email.bounced' | 
        'webhook.received' | 
        'status.change';
  eventId: string;
  userId?: string;
  contactId?: string;
  subId?: string;
  profileId?: string;
  msgId?: string;
  amount?: number;
  attempt?: number;
  reason?: string;
  note?: string;
}

export class BillingAuditLogger {
  private readonly logDir = join(process.cwd(), 'app', 'logs');
  private readonly logFile = join(this.logDir, 'billing-dunning.md');

  constructor() {
    this.ensureLogDirectory();
  }

  private ensureLogDirectory(): void {
    if (!existsSync(this.logDir)) {
      mkdirSync(this.logDir, { recursive: true });
    }
  }

  private getCurrentDateSection(): string {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    const day = String(now.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private formatEventLine(event: BillingAuditEvent): string {
    let line = `- ${event.timestamp} | type=${event.type} eventId=${event.eventId}`;
    
    if (event.userId) line += ` userId=${event.userId}`;
    if (event.contactId) line += ` contactId=${event.contactId}`;
    if (event.subId) line += ` subId=${event.subId}`;
    if (event.profileId) line += ` profileId=${event.profileId}`;
    if (event.msgId) line += ` msgId=${event.msgId}`;
    if (event.amount !== undefined) line += ` amount=${event.amount}`;
    if (event.attempt !== undefined) line += ` attempt=${event.attempt}`;
    if (event.reason) line += ` reason="${event.reason}"`;
    if (event.note) line += ` note="${event.note}"`;
    
    return line;
  }

  private readLogFile(): string {
    if (!existsSync(this.logFile)) {
      return '# Billing & Dunning Audit Log\n\n';
    }
    return readFileSync(this.logFile, 'utf-8');
  }

  private writeLogFile(content: string): void {
    writeFileSync(this.logFile, content, 'utf-8');
  }

  private checkEventExists(content: string, eventId: string, dateSection: string): boolean {
    const dateSectionStart = content.indexOf(`## ${dateSection}`);
    if (dateSectionStart === -1) return false;
    
    const nextDateSection = content.indexOf('\n## ', dateSectionStart + 1);
    const sectionEnd = nextDateSection === -1 ? content.length : nextDateSection;
    const sectionContent = content.slice(dateSectionStart, sectionEnd);
    
    return sectionContent.includes(`eventId=${eventId}`);
  }

  private insertDateSection(content: string, dateSection: string): string {
    // Check if date section already exists
    if (content.includes(`## ${dateSection}`)) {
      return content;
    }

    // Find the right place to insert the new date section
    const lines = content.split('\n');
    let insertIndex = lines.length;

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('## ')) {
        const existingDate = lines[i].slice(3);
        if (dateSection > existingDate) {
          insertIndex = i;
          break;
        }
      }
    }

    // Insert the new date section
    lines.splice(insertIndex, 0, `## ${dateSection}`, '');
    return lines.join('\n');
  }

  public logEvent(event: BillingAuditEvent): void {
    try {
      const dateSection = this.getCurrentDateSection();
      let content = this.readLogFile();

      // Check for duplicate eventId on the same day
      if (this.checkEventExists(content, event.eventId, dateSection)) {
        console.log(`Billing audit: Skipping duplicate event ${event.eventId} for ${dateSection}`);
        return;
      }

      // Ensure date section exists
      content = this.insertDateSection(content, dateSection);

      // Find the date section and append the event
      const dateSectionStart = content.indexOf(`## ${dateSection}`);
      const nextDateSection = content.indexOf('\n## ', dateSectionStart + 1);
      
      let insertPoint: number;
      if (nextDateSection === -1) {
        // This is the last section, append at the end
        insertPoint = content.length;
      } else {
        // Insert before the next date section
        insertPoint = nextDateSection;
      }

      const eventLine = this.formatEventLine(event);
      const beforeInsert = content.slice(0, insertPoint).trimEnd();
      const afterInsert = content.slice(insertPoint);
      
      // Add the event line with proper spacing
      let newContent = beforeInsert;
      if (!newContent.endsWith('\n')) {
        newContent += '\n';
      }
      newContent += eventLine + '\n';
      if (afterInsert && !afterInsert.startsWith('\n')) {
        newContent += '\n';
      }
      newContent += afterInsert;

      this.writeLogFile(newContent);
      console.log(`Billing audit: Logged event ${event.type} with ID ${event.eventId}`);
    } catch (error) {
      console.error('Failed to log billing audit event:', error);
    }
  }

  // Convenience methods for common events
  public logSubscriptionFailed(eventId: string, userId: string, contactId: string, subId: string, amount: number, reason: string, attempt: number = 1): void {
    this.logEvent({
      timestamp: new Date().toISOString(),
      type: 'net.authorize.customer.subscription.failed',
      eventId,
      userId,
      contactId,
      subId,
      amount,
      reason,
      attempt
    });
  }

  public logSubscriptionSuspended(eventId: string, userId: string, contactId: string, subId: string, reason?: string): void {
    this.logEvent({
      timestamp: new Date().toISOString(),
      type: 'net.authorize.customer.subscription.suspended',
      eventId,
      userId,
      contactId,
      subId,
      reason
    });
  }

  public logSubscriptionUpdated(eventId: string, userId: string, contactId: string, subId: string, note?: string): void {
    this.logEvent({
      timestamp: new Date().toISOString(),
      type: 'net.authorize.customer.subscription.updated',
      eventId,
      userId,
      contactId,
      subId,
      note
    });
  }

  public logEmailSent(msgId: string, userId: string, contactId: string, subId: string, reason: string): void {
    this.logEvent({
      timestamp: new Date().toISOString(),
      type: 'email.sent',
      eventId: `email:${msgId}`,
      userId,
      contactId,
      subId,
      msgId,
      reason
    });
  }

  public logEmailBounced(msgId: string, userId: string, contactId: string, reason: string): void {
    this.logEvent({
      timestamp: new Date().toISOString(),
      type: 'email.bounced',
      eventId: `email:${msgId}`,
      userId,
      contactId,
      msgId,
      reason
    });
  }

  public logWebhookReceived(eventId: string, note?: string): void {
    this.logEvent({
      timestamp: new Date().toISOString(),
      type: 'webhook.received',
      eventId: `webhook:${eventId}`,
      note
    });
  }

  public logStatusChange(userId: string, contactId: string, subId: string, note: string): void {
    const eventId = `stat_${subId}_${Date.now()}`;
    this.logEvent({
      timestamp: new Date().toISOString(),
      type: 'status.change',
      eventId,
      userId,
      contactId,
      subId,
      note
    });
  }
}

export const billingAuditLogger = new BillingAuditLogger();