import axios from 'axios';
import { installToastDedupe } from './utils/toastDedupe';

installToastDedupe();

window.axios = axios;

window.axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';
