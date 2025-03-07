import { Connector, ConnectorUpdateData } from '../connector'
import { providers } from 'ethers'
import detectEthereumProvider from '@metamask/detect-provider'
import { Event } from '../../../../helpers/event'

const GET_METAMASK_LINK = 'https://metamask.io/download.html'

export async function getMetamaskProvider() {
  if (!window.ethereum) {
    window.open(GET_METAMASK_LINK)
    return undefined
  }

  const injectedProviders: any[] = (window?.ethereum as any).providers || []
  const injectedProvider: any =
    injectedProviders.find((provider) => {
      return provider.isMetaMask ?? false
    }) ?? (await detectEthereumProvider())

  if (!injectedProvider) {
    console.log(`Metamask is not installed - you can get it under ${GET_METAMASK_LINK}`)
    return undefined
  }

  const provider = new providers.Web3Provider(injectedProvider, 'any')
  return provider
}

export class MetamaskConnector implements Connector {
  public provider?: providers.Web3Provider
  public readonly name = 'Metamask'

  readonly update = new Event<ConnectorUpdateData>()

  private async init() {
    if (this.provider) return
    const metamask = await getMetamaskProvider()
    if (!metamask) {
      return
    }
    this.provider = metamask
  }

  async connectEagerly(): Promise<void> {
    await this.init()

    if (!this.provider) {
      return
    }

    try {
      const chainId: string = await this.provider!.send('eth_chainId', [])
      const accounts: string[] = await this.provider!.send('eth_accounts', [])
      this.update.emit({ chainId: parseInt(chainId), accounts })
    } catch (e) {
      console.debug(e)
    }
  }

  async activate(): Promise<void> {
    await this.init()

    if (!this.provider) {
      throw new Error('Could not activate connector')
    }

    try {
      const chainId: string = await this.provider!.send('eth_chainId', [])
      const accounts: string[] = await this.provider!.send('eth_requestAccounts', [])
      this.update.emit({ chainId: parseInt(chainId), accounts })
    } catch (e: any) {
      console.log(e)
      throw new Error('Could not activate connector: ' + (e.message ?? ''))
    }
  }

  async deactivate(): Promise<void> {
    this.provider = undefined
  }
}
