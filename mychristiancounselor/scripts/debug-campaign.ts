import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugCampaign() {
  try {
    // Get all campaigns
    const campaigns = await prisma.emailCampaign.findMany({
      select: {
        id: true,
        name: true,
        status: true,
        createdById: true,
      },
    });

    console.log('All campaigns:', JSON.stringify(campaigns, null, 2));

    if (campaigns.length === 0) {
      console.log('No campaigns found');
      return;
    }

    const campaignId = campaigns[0].id;
    console.log(`\nTrying to fetch campaign ${campaignId}...`);

    // Try the same query that getCampaign uses
    const campaign = await prisma.emailCampaign.findUnique({
      where: { id: campaignId },
      include: {
        createdBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        recipients: {
          include: {
            prospect: {
              select: {
                id: true,
                organizationName: true,
                website: true,
                industry: true,
                estimatedSize: true,
                lastCampaignSentAt: true,
              },
            },
            prospectContact: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                title: true,
                isPrimary: true,
              },
            },
            emailLog: {
              select: {
                status: true,
                sentAt: true,
                deliveredAt: true,
                openedAt: true,
                clickedAt: true,
                bouncedAt: true,
                bounceReason: true,
              },
            },
          },
        },
      },
    });

    if (!campaign) {
      console.log('Campaign not found with query');
    } else {
      console.log('Campaign found!');
      console.log('Recipients count:', campaign.recipients.length);
      console.log('Sample recipient:', JSON.stringify(campaign.recipients[0], null, 2));
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugCampaign();
