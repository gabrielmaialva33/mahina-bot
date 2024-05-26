import axios from 'axios'

export class LexicaApi {
  private BASE_URL = 'https://lexica.qewertyy.dev'
  //private ALTERNATE_URL = 'https://api.qewertyy.dev'
  private __version__ = '1.5.9'

  private SESSION_HEADERS = {
    'Host': 'lexica.qewertyy.dev',
    'User-Agent': `Lexica/${this.__version__}`,
  }

  async request(endpoint: string, method: string, data: any = null) {
    try {
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

  //     def generate(self : "Client",model_id:int,prompt:str,negative_prompt:str="",images: int=1) -> dict:
  //         """
  //         Generate image from a prompt
  //         Example:
  //         >>> client = Client()
  //         >>> response = client.generate(model_id,prompt,negative_prompt)
  //         >>> print(response)
  //
  //         Args:
  //             prompt (str): Input text for the query.
  //             negative_prompt (str): Input text for the query.
  //
  //         Returns:
  //             dict: Answer from the API in the following format:
  //                 {
  //                     "message": str,
  //                     "task_id": int,
  //                     "request_id": str
  //                 }
  //         """
  //         payload = {
  //             "model_id": model_id,
  //             "prompt": prompt,
  //             "negative_prompt": negative_prompt, #optional
  //             "num_images": images,  #optional number of images to generate (default: 1) and max 4
  //         }
  //         resp = self._request(
  //             url=f'{self.url}/models/inference',
  //             method='POST',
  //             json=payload,
  //             headers={"content-type": "application/json"}
  //         )
  //         return resp
  //
  //     def getImages(self : "Client",task_id:str,request_id:str) -> dict:
  //         """
  //         Generate image from a prompt
  //         Example:
  //         >>> client = Client()
  //         >>> response = client.getImages(task_id,request_id)
  //         >>> print(response)
  //
  //         Args:
  //             prompt (str): Input text for the query.
  //             negative_prompt (str): Input text for the query.
  //
  //         Returns:
  //             dict: Answer from the API in the following format:
  //                 {
  //                     "message": str,
  //                     "img_urls": array,
  //                     "code": int
  //                 }
  //         """
  //         payload = {
  //             "task_id": task_id,
  //             "request_id": request_id
  //         }
  //         resp = self._request(
  //             url=f'{self.url}/models/inference/task',
  //             method='POST',
  //             json=payload,
  //             headers={"content-type": "application/json"}
  //         )
  //         return resp
  //

  async generateImage(
    modelId: number,
    prompt: string,
    negativePrompt: string = '',
    images: number = 1
  ) {
    const payload = {
      model_id: modelId,
      prompt: prompt,
      negative_prompt: negativePrompt,
      num_images: images,
    }
    return this.request('/models/inference', 'POST', payload)
  }

  async getImages(taskId: string, requestId: string) {
    const payload = {
      task_id: taskId,
      request_id: requestId,
    }
    return this.request('/models/inference/task', 'POST', payload)
  }
}
