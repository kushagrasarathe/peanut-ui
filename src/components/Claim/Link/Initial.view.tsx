'use client'
import AddressInput from '@/components/Global/AddressInput'
import * as _consts from '../Claim.consts'
import { useContext, useEffect, useState } from 'react'
import ConfirmDetails from '@/components/Global/ConfirmDetails/Index'
import Icon from '@/components/Global/Icon'
import * as assets from '@/assets'
import { useAccount } from 'wagmi'
import { useWeb3Modal } from '@web3modal/wagmi/react'
import useClaimLink from '../useClaimLink'
import * as context from '@/context'
import Loading from '@/components/Global/Loading'
import * as utils from '@/utils'
export const InitialClaimLinkView = ({
    onNext,
    claimLinkData,
    setRecipientAddress,
    recipientAddress,
    tokenPrice,
    setClaimType,
    setEstimatedPoints,
    attachment,
}: _consts.IClaimScreenProps) => {
    const [initiatedWalletConnection, setInitiatedWalletConnection] = useState(false)
    const { setLoadingState, loadingState, isLoading } = useContext(context.loadingStateContext)
    const [isValidAddress, setIsValidAddress] = useState(false)
    const [fileType, setFileType] = useState<string>('')

    const { estimatePoints } = useClaimLink()

    const { isConnected, address } = useAccount()
    const { open } = useWeb3Modal()

    const handleConnectWallet = async () => {
        if (!isConnected) {
            open()
            setInitiatedWalletConnection(true)
        } else {
            setRecipientAddress('')
            const USDValue = Number(claimLinkData.tokenAmount) * (tokenPrice ?? 0)

            const estimatedPoints = await estimatePoints({
                address: address ?? '',
                link: claimLinkData.link,
                chainId: claimLinkData.chainId,
                amountUSD: USDValue,
            })
            setEstimatedPoints(estimatedPoints)
            setClaimType('wallet')
            onNext()
        }
    }

    const handleEnteredAddress = async (address: string) => {
        try {
            setLoadingState('Estimating points')
            const USDValue = Number(claimLinkData.tokenAmount) * (tokenPrice ?? 0)

            const estimatedPoints = await estimatePoints({
                address: address ?? '',
                link: claimLinkData.link,
                chainId: claimLinkData.chainId,
                amountUSD: USDValue,
            })
            setEstimatedPoints(estimatedPoints)
            setClaimType('address')
            onNext()
        } catch (error) {
            console.log('Error estimating points:', error)
        } finally {
            setLoadingState('Idle')
        }
    }

    useEffect(() => {
        if (initiatedWalletConnection && isConnected) {
            handleConnectWallet()
        }
    }, [isConnected])
    useEffect(() => {
        if (attachment?.attachmentUrl) {
            fetch(attachment?.attachmentUrl)
                .then((response) => response.blob())
                .then((blob) => {
                    setFileType(blob.type)
                })
                .catch((error) => {
                    console.error('Error fetching the blob from URL:', error)
                    setFileType('') // Reset or handle the error state
                })
        }
    }, [attachment?.attachmentUrl])

    return (
        <div className="flex w-full flex-col items-center justify-center gap-6 text-center">
            <label className="text-h2">You've received</label>

            <ConfirmDetails
                tokenAmount={claimLinkData.tokenAmount}
                tokenPrice={tokenPrice}
                selectedChainID={claimLinkData.chainId}
                selectedTokenAddress={claimLinkData.tokenAddress}
            />

            {attachment.message || attachment.attachmentUrl ? (
                <>
                    {' '}
                    <div className="flex w-full border-t border-dotted border-black" />
                    <div
                        className={`flex w-full items-center justify-center gap-2 ${utils.checkifImageType(fileType) ? ' flex-row' : ' flex-col'}`}
                    >
                        {attachment.attachmentUrl && utils.checkifImageType(fileType) ? (
                            <img src={attachment.attachmentUrl} className="h-18 w-18" alt="attachment" />
                        ) : (
                            <a
                                href={attachment.attachmentUrl}
                                download
                                target="_blank"
                                className="flex w-full cursor-pointer flex-row items-center justify-center gap-1 text-h8 underline "
                            >
                                <Icon name={'download'} />
                                Download attachment
                            </a>
                        )}
                        {attachment.message && (
                            <label className="text-h8 font-normal text-gray-1">{attachment.message}</label>
                        )}
                    </div>
                    <div className="flex w-full border-t border-dotted border-black" />
                </>
            ) : (
                <label className="max-w-96 px-2 text-start text-h8 font-light">
                    Manually enter your wallet or ENS address below or connect your wallet to claim the fund. You can
                    also swap after connecting your wallet!
                </label>
            )}

            <div className="flex w-full flex-col items-start justify-center gap-3 px-2">
                <AddressInput
                    className="px-1"
                    placeholder="Paste wallet or ens address"
                    value={recipientAddress ?? ''}
                    onSubmit={(address: string) => {
                        setRecipientAddress(address)
                    }}
                    _setIsValidAddress={(valid: boolean) => {
                        console.log('valid:', valid)
                        setIsValidAddress(valid)
                    }}
                />
                <div className="flex flex-row items-center justify-center gap-1 px-2 text-h9 font-normal">
                    <Icon name={'warning'} />
                    <label>You will lose your funds if you enter a wrong address.</label>
                </div>
                {isValidAddress ? (
                    <button
                        className="btn-purple btn-xl"
                        onClick={() => {
                            handleEnteredAddress(recipientAddress ?? '')
                        }}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <div className="flex w-full flex-row items-center justify-center gap-2">
                                <Loading /> {loadingState}
                            </div>
                        ) : (
                            'Confirm'
                        )}
                    </button>
                ) : (
                    <div
                        className="flex cursor-pointer flex-row items-center justify-center gap-1 self-center text-h9 text-purple-1"
                        onClick={handleConnectWallet}
                    >
                        <img src={assets.WALLETCONNECT_LOGO.src} className="h-4 w-4" />
                        <label className="cursor-pointer">
                            {isConnected
                                ? 'Or claim/swap to your connected wallet'
                                : 'Or connect your wallet to claim or swap.'}
                        </label>
                    </div>
                )}
            </div>
        </div>
    )
}

export default InitialClaimLinkView
