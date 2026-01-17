import axios from 'axios';
import { getApiPath } from '../support/test-helpers';

describe('GET /api', () => {
  it('should return a message', async () => {
    const res = await axios.get(getApiPath('api'));

    expect(res.status).toBe(200);
    expect(res.data).toEqual({ message: 'Hello API' });
    expect(res.headers['x-api-version']).toBe('1');
  });
});
