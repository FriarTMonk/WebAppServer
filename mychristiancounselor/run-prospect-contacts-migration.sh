#!/bin/bash
# Run the ProspectContact migration on production

# Copy migration file to API container
echo "Copying migration file to API container..."
cat packages/api/prisma/migrations/add_prospect_contacts.sql | \
  ssh -i ~/mychristiancounselor-lightsail-key.pem ec2-user@api.mychristiancounselor.online \
  "sudo docker exec -i api sh -c 'cat > /tmp/add_prospect_contacts.sql'"

# Run the migration
echo "Running migration..."
ssh -i ~/mychristiancounselor-lightsail-key.pem ec2-user@api.mychristiancounselor.online \
  "sudo docker exec api sh -c 'PGPASSWORD=\$DATABASE_URL psql \$DATABASE_URL -f /tmp/add_prospect_contacts.sql'"

echo "Migration complete!"
