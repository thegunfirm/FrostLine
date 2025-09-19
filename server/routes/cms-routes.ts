import { Router } from 'express';
import { db } from '../db';
import { 
  membershipTierSettings,
  heroCarouselSlides,
  categoryRibbons,
  adminSettings,
  systemSettings,
  emailTemplates
} from '@shared/schema';
import { eq, desc } from 'drizzle-orm';
import { storage } from '../storage';

const router = Router();

// NO AUTHENTICATION - CloudFlare handles security

// ===== TIER SETTINGS =====
router.get('/tier-settings', async (req, res) => {
  try {
    const tierSettings = await db.select().from(membershipTierSettings);
    res.json(tierSettings);
  } catch (error) {
    console.error('Error fetching tier settings:', error);
    res.status(500).json({ error: 'Failed to fetch tier settings' });
  }
});

router.put('/tier-settings/:id', async (req, res) => {
  try {
    const updated = await db
      .update(membershipTierSettings)
      .set(req.body)
      .where(eq(membershipTierSettings.id, parseInt(req.params.id)))
      .returning();
    res.json(updated[0]);
  } catch (error) {
    console.error('Error updating tier settings:', error);
    res.status(500).json({ error: 'Failed to update tier settings' });
  }
});

router.get('/tier-label-settings', async (req, res) => {
  try {
    const settings = await storage.getTierLabelSettings();
    res.json(settings);
  } catch (error) {
    console.error('Error fetching tier label settings:', error);
    res.status(500).json({ error: 'Failed to fetch tier label settings' });
  }
});

router.put('/tier-label-settings', async (req, res) => {
  try {
    const settings = await storage.updateTierLabelSettings(req.body);
    res.json(settings);
  } catch (error) {
    console.error('Error updating tier label settings:', error);
    res.status(500).json({ error: 'Failed to update tier label settings' });
  }
});

// ===== EMAIL TEMPLATES =====
router.get('/email-templates', async (req, res) => {
  try {
    const templates = await db.select().from(emailTemplates);
    res.json(templates);
  } catch (error) {
    console.error('Error fetching email templates:', error);
    res.status(500).json({ error: 'Failed to fetch email templates' });
  }
});

router.get('/email-templates/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const [template] = await db.select()
      .from(emailTemplates)
      .where(eq(emailTemplates.slug, slug))
      .limit(1);
    
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    res.json(template);
  } catch (error) {
    console.error('Error fetching email template:', error);
    res.status(500).json({ error: 'Failed to fetch email template' });
  }
});

router.put('/email-templates/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const { subject, htmlContent, variables } = req.body;
    
    const updated = await db.update(emailTemplates)
      .set({ 
        subject,
        htmlContent,
        variables,
        updatedAt: new Date()
      })
      .where(eq(emailTemplates.slug, slug))
      .returning();
    
    if (updated.length === 0) {
      // Create new template if doesn't exist
      const created = await db.insert(emailTemplates)
        .values({
          slug,
          name: slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
          subject,
          htmlContent,
          variables,
          isActive: true
        })
        .returning();
      return res.json(created[0]);
    }
    
    res.json(updated[0]);
  } catch (error) {
    console.error('Error updating email template:', error);
    res.status(500).json({ error: 'Failed to update email template' });
  }
});

router.post('/email-templates/:slug/test', async (req, res) => {
  try {
    const { slug } = req.params;
    const { recipientEmail, testData } = req.body;
    
    const [template] = await db.select()
      .from(emailTemplates)
      .where(eq(emailTemplates.slug, slug))
      .limit(1);
    
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    // Send test email
    const { sendEmailFromTemplate } = await import('../services/email-service');
    await sendEmailFromTemplate(recipientEmail, slug, testData || {});
    
    res.json({ success: true, message: `Test email sent to ${recipientEmail}` });
  } catch (error) {
    console.error('Error sending test email:', error);
    res.status(500).json({ error: 'Failed to send test email' });
  }
});

// ===== HERO CAROUSEL =====
router.get('/hero-carousel', async (req, res) => {
  try {
    const slides = await db.select()
      .from(heroCarouselSlides)
      .orderBy(heroCarouselSlides.displayOrder);
    res.json(slides);
  } catch (error) {
    console.error('Error fetching hero carousel:', error);
    res.status(500).json({ error: 'Failed to fetch hero carousel' });
  }
});

router.post('/hero-carousel', async (req, res) => {
  try {
    const newSlide = await db.insert(heroCarouselSlides)
      .values(req.body)
      .returning();
    res.json(newSlide[0]);
  } catch (error) {
    console.error('Error creating carousel slide:', error);
    res.status(500).json({ error: 'Failed to create carousel slide' });
  }
});

router.put('/hero-carousel/:id', async (req, res) => {
  try {
    const updated = await db
      .update(heroCarouselSlides)
      .set(req.body)
      .where(eq(heroCarouselSlides.id, parseInt(req.params.id)))
      .returning();
    res.json(updated[0]);
  } catch (error) {
    console.error('Error updating carousel slide:', error);
    res.status(500).json({ error: 'Failed to update carousel slide' });
  }
});

router.delete('/hero-carousel/:id', async (req, res) => {
  try {
    await db.delete(heroCarouselSlides)
      .where(eq(heroCarouselSlides.id, parseInt(req.params.id)));
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting carousel slide:', error);
    res.status(500).json({ error: 'Failed to delete carousel slide' });
  }
});

// ===== CATEGORY RIBBONS =====
router.get('/category-ribbons', async (req, res) => {
  try {
    const ribbons = await db.select()
      .from(categoryRibbons)
      .orderBy(categoryRibbons.displayOrder);
    res.json(ribbons);
  } catch (error) {
    console.error('Error fetching category ribbons:', error);
    res.status(500).json({ error: 'Failed to fetch category ribbons' });
  }
});

router.post('/category-ribbons', async (req, res) => {
  try {
    const newRibbon = await db.insert(categoryRibbons)
      .values(req.body)
      .returning();
    res.json(newRibbon[0]);
  } catch (error) {
    console.error('Error creating category ribbon:', error);
    res.status(500).json({ error: 'Failed to create category ribbon' });
  }
});

router.put('/category-ribbons/:id', async (req, res) => {
  try {
    const updated = await db
      .update(categoryRibbons)
      .set(req.body)
      .where(eq(categoryRibbons.id, parseInt(req.params.id)))
      .returning();
    res.json(updated[0]);
  } catch (error) {
    console.error('Error updating category ribbon:', error);
    res.status(500).json({ error: 'Failed to update category ribbon' });
  }
});

router.delete('/category-ribbons/:id', async (req, res) => {
  try {
    await db.delete(categoryRibbons)
      .where(eq(categoryRibbons.id, parseInt(req.params.id)));
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting category ribbon:', error);
    res.status(500).json({ error: 'Failed to delete category ribbon' });
  }
});

// ===== NOTIFICATION SETTINGS =====
router.get('/notification-settings', async (req, res) => {
  try {
    const settings = await db.select()
      .from(systemSettings)
      .where(eq(systemSettings.key, 'notification_settings'));
    
    if (settings.length === 0) {
      return res.json({
        orderConfirmation: true,
        shippingUpdates: true,
        promotionalEmails: false,
        inventoryAlerts: true
      });
    }
    
    res.json(JSON.parse(settings[0].value || '{}'));
  } catch (error) {
    console.error('Error fetching notification settings:', error);
    res.status(500).json({ error: 'Failed to fetch notification settings' });
  }
});

router.put('/notification-settings', async (req, res) => {
  try {
    await db.insert(systemSettings)
      .values({ 
        key: 'notification_settings',
        value: JSON.stringify(req.body)
      })
      .onConflictDoUpdate({
        target: systemSettings.key,
        set: { value: JSON.stringify(req.body) }
      });
    
    res.json(req.body);
  } catch (error) {
    console.error('Error updating notification settings:', error);
    res.status(500).json({ error: 'Failed to update notification settings' });
  }
});

// ===== CONTENT MANAGEMENT =====
router.get('/content/:page', async (req, res) => {
  try {
    const { page } = req.params;
    const key = `content_${page}`;
    
    const [content] = await db.select()
      .from(systemSettings)
      .where(eq(systemSettings.key, key))
      .limit(1);
    
    if (!content) {
      return res.json({ content: '', page });
    }
    
    res.json({ content: content.value, page });
  } catch (error) {
    console.error('Error fetching content:', error);
    res.status(500).json({ error: 'Failed to fetch content' });
  }
});

router.put('/content/:page', async (req, res) => {
  try {
    const { page } = req.params;
    const { content } = req.body;
    const key = `content_${page}`;
    
    await db.insert(systemSettings)
      .values({ key, value: content })
      .onConflictDoUpdate({
        target: systemSettings.key,
        set: { value: content }
      });
    
    res.json({ success: true, page, content });
  } catch (error) {
    console.error('Error updating content:', error);
    res.status(500).json({ error: 'Failed to update content' });
  }
});

// ===== CAMPAIGN MANAGEMENT =====
router.get('/campaigns', async (req, res) => {
  try {
    const [campaigns] = await db.select()
      .from(systemSettings)
      .where(eq(systemSettings.key, 'marketing_campaigns'))
      .limit(1);
    
    if (!campaigns) {
      return res.json([]);
    }
    
    res.json(JSON.parse(campaigns.value || '[]'));
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    res.status(500).json({ error: 'Failed to fetch campaigns' });
  }
});

router.post('/campaigns', async (req, res) => {
  try {
    const [existing] = await db.select()
      .from(systemSettings)
      .where(eq(systemSettings.key, 'marketing_campaigns'))
      .limit(1);
    
    const campaigns = existing ? JSON.parse(existing.value || '[]') : [];
    const newCampaign = {
      ...req.body,
      id: Date.now().toString(),
      createdAt: new Date().toISOString()
    };
    campaigns.push(newCampaign);
    
    await db.insert(systemSettings)
      .values({ 
        key: 'marketing_campaigns',
        value: JSON.stringify(campaigns)
      })
      .onConflictDoUpdate({
        target: systemSettings.key,
        set: { value: JSON.stringify(campaigns) }
      });
    
    res.json(newCampaign);
  } catch (error) {
    console.error('Error creating campaign:', error);
    res.status(500).json({ error: 'Failed to create campaign' });
  }
});

// ===== SEO SETTINGS =====
router.get('/seo-settings', async (req, res) => {
  try {
    const settings = await db.select()
      .from(systemSettings)
      .where(eq(systemSettings.key, 'seo_settings'));
    
    if (settings.length === 0) {
      return res.json({
        defaultTitle: 'The Gun Firm - Premium Firearms & Accessories',
        defaultDescription: 'Shop the best selection of firearms and accessories',
        defaultKeywords: 'firearms, guns, accessories, shooting'
      });
    }
    
    res.json(JSON.parse(settings[0].value || '{}'));
  } catch (error) {
    console.error('Error fetching SEO settings:', error);
    res.status(500).json({ error: 'Failed to fetch SEO settings' });
  }
});

router.put('/seo-settings', async (req, res) => {
  try {
    await db.insert(systemSettings)
      .values({ 
        key: 'seo_settings',
        value: JSON.stringify(req.body)
      })
      .onConflictDoUpdate({
        target: systemSettings.key,
        set: { value: JSON.stringify(req.body) }
      });
    
    res.json(req.body);
  } catch (error) {
    console.error('Error updating SEO settings:', error);
    res.status(500).json({ error: 'Failed to update SEO settings' });
  }
});

// ===== MEDIA LIBRARY =====
router.get('/media', async (req, res) => {
  try {
    const [media] = await db.select()
      .from(systemSettings)
      .where(eq(systemSettings.key, 'media_library'))
      .limit(1);
    
    if (!media) {
      return res.json([]);
    }
    
    res.json(JSON.parse(media.value || '[]'));
  } catch (error) {
    console.error('Error fetching media library:', error);
    res.status(500).json({ error: 'Failed to fetch media library' });
  }
});

router.post('/media/upload', async (req, res) => {
  try {
    const { filename, url, type, size } = req.body;
    
    const [existing] = await db.select()
      .from(systemSettings)
      .where(eq(systemSettings.key, 'media_library'))
      .limit(1);
    
    const media = existing ? JSON.parse(existing.value || '[]') : [];
    const newMedia = {
      id: Date.now().toString(),
      filename,
      url,
      type,
      size,
      uploadedAt: new Date().toISOString()
    };
    media.push(newMedia);
    
    await db.insert(systemSettings)
      .values({ 
        key: 'media_library',
        value: JSON.stringify(media)
      })
      .onConflictDoUpdate({
        target: systemSettings.key,
        set: { value: JSON.stringify(media) }
      });
    
    res.json(newMedia);
  } catch (error) {
    console.error('Error uploading media:', error);
    res.status(500).json({ error: 'Failed to upload media' });
  }
});

export default router;