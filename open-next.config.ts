import { defineCloudflareConfig } from '@opennextjs/cloudflare';

import motionPageCache from './src/lib/cloudflare/motion-page-cache';

export default defineCloudflareConfig({ incrementalCache: motionPageCache });
