import Box from '@cloudscape-design/components/box';
import { getPublicSettings } from '../config';

const DEFAULT_TEXT = 'AWS Transfer Portal';
const DEFAULT_LINK = 'https://github.com/rusty428/aws-transfer-portal-frontend';

export default function Footer() {
  const settings = getPublicSettings();
  
  // If footerText is explicitly empty string, hide the footer entirely
  const footerText = settings?.footerText ?? DEFAULT_TEXT;
  const footerLink = settings?.footerLink ?? DEFAULT_LINK;

  if (footerText === '') return null;

  return (
    <div style={{
      textAlign: 'center',
      padding: '12px 0',
      borderTop: '1px solid var(--color-border-divider-default, #e9ebed)',
    }}>
      <Box color="text-body-secondary" fontSize="body-s">
        {footerLink ? (
          <>
            Built with{' '}
            <a
              href={footerLink}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'inherit', textDecoration: 'underline' }}
            >
              {footerText}
            </a>
          </>
        ) : (
          <>Built with {footerText}</>
        )}
      </Box>
    </div>
  );
}
