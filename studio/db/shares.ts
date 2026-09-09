import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '../app/chatgpt-auth';
import {shareApi} from '../lib/share-api';
export const handleShare=shareApi({database:()=>{if(!env.DB)throw Error('D1 DB unavailable');return env.DB;},user:getChatGPTUser});
