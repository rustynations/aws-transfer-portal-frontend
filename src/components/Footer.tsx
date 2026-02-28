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
     borderTop: '1px solid var(--color-border-control-default, #414d5c)',
       backgroundColor: 'var(--color-background-home-header, #0f1b2a)',

    }}>
      <Box  fontSize="body-s">
        <span style={{ color: '#ffffff' }}>
        {footerLink ? (
          <a
            href={footerLink}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'inherit', textDecoration: 'underline' }}
          >
            {footerText}
          </a>
        ) : (
          <>{footerText}</>
        )}
        </span>
      </Box>
    </div>
  );
}
