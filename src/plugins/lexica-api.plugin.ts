import axios from 'axios'

export class LexicaApi {
  private BASE_URL = 'https://lexica.qewertyy.dev'
  //private ALTERNATE_URL = 'https://api.qewertyy.dev'
  private __version__ = '1.5.9'

  private SESSION_HEADERS = {
    'Host': 'lexica.qewertyy.dev',
    'User-Agent': `Lexica/${this.__version__}`,
  }

  constructor() {}

  async request(endpoint: string, method: string, data: any = null) {
    try {
      console.log('Requesting', {
        method: method,
        url: this.BASE_URL + endpoint,
        headers: this.SESSION_HEADERS,
        data: data,
      })
      const response = await axios({
        method: method,
        url: this.BASE_URL + endpoint,
        headers: this.SESSION_HEADERS,
        data: data,
      })
      return response.data
    } catch (error) {
      console.error(error)
      return null
    }
  }

  async getModels() {
    return this.request('/models', 'GET')
  }

  // curl -X 'POST' \
  //   'https://api.qewertyy.dev/models?model_id=0&prompt=test' \
  //   -H 'accept: application/json' \
  //   -d ''
  async chatCompletion(prompt: string, modelId: number = 0) {
    return this.request('/models?model_id=' + modelId + '&prompt=' + prompt, 'POST', {})
  }
}
