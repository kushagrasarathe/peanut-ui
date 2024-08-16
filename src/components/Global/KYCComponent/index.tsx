'use client'
import { useContext, useState } from 'react'
import { Step, Steps, useSteps } from 'chakra-ui-steps'

import * as utils from '@/utils'
import * as interfaces from '@/interfaces'
import * as consts from '@/constants'
import * as context from '@/context'
import IframeWrapper from '../IframeWrapper'
import { useForm } from 'react-hook-form'
import { useAuth } from '@/context/authContext'
import Loading from '../Loading'
import CountryDropdown from '../CountrySelect'

const steps = [
    { label: 'Step 1: Provide personal details' },
    { label: 'Step 2: Agree to TOS' },
    { label: 'Step 3: Complete KYC' },
    { label: 'Step 4: Link bank account' },
]

interface IKYCComponentProps {
    intialStep: number
    offrampForm: consts.IOfframpForm
    setOfframpForm: (form: consts.IOfframpForm) => void
    userType: 'NEW' | 'EXISTING' | undefined
    userId: string | undefined
    recipientType: interfaces.RecipientType
    offrampChainAndToken: { chain: string; token: string }
    setPeanutAccount: (account: any) => void
    setLiquidationAddress: (address: interfaces.IBridgeLiquidationAddress | undefined) => void
}

export const KYCComponent = ({
    intialStep,
    offrampForm,
    setOfframpForm,
    userType,
    userId,
    recipientType,
    offrampChainAndToken,
    setPeanutAccount,
    setLiquidationAddress,
}: IKYCComponentProps) => {
    const [errorState, setErrorState] = useState<{
        showError: boolean
        errorMessage: string
    }>({ showError: false, errorMessage: '' })
    const [iframeOptions, setIframeOptions] = useState<{
        src: string
        visible: boolean
        onClose: () => void
    }>({
        src: '',
        visible: false,
        onClose: () => {
            setIframeOptions({ ...iframeOptions, visible: false })
        },
    })
    const [customerObject, setCustomerObject] = useState<interfaces.KYCData | null>(null)
    const [addressRequired, setAddressRequired] = useState<boolean>(false)
    const [tosLinkOpened, setTosLinkOpened] = useState<boolean>(false)
    const [kycLinkOpened, setKycLinkOpened] = useState<boolean>(false)

    const { setLoadingState, loadingState, isLoading } = useContext(context.loadingStateContext)
    const { user, fetchUser, isFetchingUser, updateUserName, updateBridgeCustomerId, addAccount } = useAuth()

    const {
        setStep: setActiveStep,
        activeStep,
        nextStep: goToNext,
    } = useSteps({
        initialStep: intialStep,
    })

    const {
        register: registerOfframp,
        watch: watchOfframp,
        formState: { errors },
    } = useForm<consts.IOfframpForm>({
        mode: 'onChange',
        defaultValues: offrampForm,
    })

    const {
        register: registerAccount,
        formState: { errors: accountErrors },
        watch: accountFormWatch,
        setValue: setAccountFormValue,
        setError: setAccountFormError,
    } = useForm({
        mode: 'onChange',
        defaultValues: {
            street: '',
            city: '',
            state: '',
            postalCode: '',
            country: '',
            accountNumber: offrampForm.recipient,
            routingNumber: '',
            BIC: '',
            type: recipientType,
        },
    })

    const handleEmail = async (inputFormData: consts.IOfframpForm) => {
        setOfframpForm(inputFormData)
        setActiveStep(0)
        // setInitiatedProcess(true)
        setLoadingState('Getting profile')

        // TODO: add validation

        try {
            console.log('inputFormData:', inputFormData)

            if (userType === 'NEW') {
                const userRegisterResponse = await fetch('/api/peanut/user/register-user', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        email: inputFormData.email,
                        password: inputFormData.password,
                        userId: userId,
                    }),
                })

                const userRegister = await userRegisterResponse.json()

                // If user already exists, login
                // TODO: remove duplicate code
                if (userRegisterResponse.status === 409) {
                    console.log(userRegister.userId)
                    const userLoginResponse = await fetch('/api/peanut/user/login-user', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            email: inputFormData.email,
                            password: inputFormData.password,
                            userId: userRegister.userId,
                        }),
                    })
                    const userLogin = await userLoginResponse.json()
                    if (userLoginResponse.status !== 200) {
                        console.log(userLogin)
                        if (userLogin === 'Invalid email format') {
                            errors.email = {
                                message: 'Invalid email format',
                                type: 'validate',
                            }
                        }
                        if (userLogin === 'Invalid email, userId') {
                            errors.email = {
                                message: 'Incorrect email',
                                type: 'validate',
                            }
                        } else if (userLogin === 'Invalid password') {
                            errors.password = {
                                message: 'Invalid password',
                                type: 'validate',
                            }
                        }

                        return
                    }
                }
            } else if (userType === 'EXISTING') {
                const userLoginResponse = await fetch('/api/peanut/user/login-user', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        email: inputFormData.email,
                        password: inputFormData.password,
                        userId: userId,
                    }),
                })
                const userLogin = await userLoginResponse.json()

                if (userLoginResponse.status !== 200) {
                    if (userLogin === 'Invalid email format') {
                        errors.email = {
                            message: 'Invalid email format',
                            type: 'validate',
                        }
                    }
                    if (userLogin === 'Invalid email, userId') {
                        errors.email = {
                            message: 'Incorrect email',
                            type: 'validate',
                        }
                    } else if (userLogin === 'Invalid password') {
                        errors.password = {
                            message: 'Invalid password',
                            type: 'validate',
                        }
                    }

                    return
                }

                setLoadingState('Getting KYC status')
            }

            await fetchUser()

            if (user?.user?.bridge_customer_id) {
                if (
                    user?.accounts.find(
                        (account) =>
                            account.account_identifier.toLowerCase().replaceAll(' ', '') ===
                            inputFormData.recipient.toLowerCase().replaceAll(' ', '')
                    )
                ) {
                    setActiveStep(4)
                } else {
                    setActiveStep(3)
                }
            } else {
                let data = await utils.getUserLinks(inputFormData)
                setCustomerObject(data)

                console.log(data)

                let { tos_status: tosStatus, kyc_status: kycStatus } = data

                if (tosStatus !== 'approved') {
                    goToNext()
                    return
                }

                if (kycStatus !== 'approved') {
                    setActiveStep(2)
                    return
                }
                recipientType === 'us' && setAddressRequired(true)
                setActiveStep(3)
            }
        } catch (error: any) {
            console.error('Error during the submission process:', error)
            setErrorState({ showError: true, errorMessage: 'An error occurred. Please try again later' })
        } finally {
            setLoadingState('Idle')
        }
    }

    const handleTOSStatus = async () => {
        try {
            // Handle TOS status

            let _customerObject
            console.log(offrampForm)

            if (!customerObject) {
                _customerObject = await utils.getUserLinks(offrampForm)
                setCustomerObject(_customerObject)
            } else {
                _customerObject = customerObject
            }

            const { tos_status: tosStatus, id, tos_link } = _customerObject

            console.log('tosStatus:', tosStatus)

            if (tosStatus !== 'approved') {
                setLoadingState('Awaiting TOS confirmation')

                console.log('Awaiting TOS confirmation...')
                setIframeOptions({ ...iframeOptions, src: tos_link, visible: true })
                await utils.awaitStatusCompletion(
                    id,
                    'tos',
                    tosStatus,
                    tos_link,
                    setTosLinkOpened,
                    setKycLinkOpened,
                    tosLinkOpened,
                    kycLinkOpened
                )
            } else {
                console.log('TOS already approved.')
            }
            setLoadingState('Idle')
            goToNext()
        } catch (error) {
            console.error('Error during the submission process:', error)

            setErrorState({ showError: true, errorMessage: 'An error occurred. Please try again later' })

            setLoadingState('Idle')
        } finally {
            setLoadingState('Idle')
        }
    }

    const handleKYCStatus = async () => {
        try {
            let _customerObject
            if (!customerObject) {
                _customerObject = await utils.getUserLinks(offrampForm)
                setCustomerObject(_customerObject)
            } else {
                _customerObject = customerObject
            }
            const { kyc_status: kycStatus, id, kyc_link } = _customerObject
            if (kycStatus === 'under_review') {
                setErrorState({
                    showError: true,
                    errorMessage: 'KYC under review',
                })
            } else if (kycStatus === 'rejected') {
                setErrorState({
                    showError: true,
                    errorMessage: 'KYC rejected',
                })
            } else if (kycStatus !== 'approved') {
                setLoadingState('Awaiting KYC confirmation')
                console.log('Awaiting KYC confirmation...')
                const kyclink = utils.convertPersonaUrl(kyc_link)
                console.log(kyclink)
                setIframeOptions({ ...iframeOptions, src: kyclink, visible: true })
                await utils.awaitStatusCompletion(
                    id,
                    'kyc',
                    kycStatus,
                    kyc_link,
                    setTosLinkOpened,
                    setKycLinkOpened,
                    tosLinkOpened,
                    kycLinkOpened
                )
            } else {
                console.log('KYC already approved.')
            }

            // Get customer ID
            const customer = await utils.getStatus(_customerObject.id, 'customer_id')
            setCustomerObject({ ..._customerObject, customer_id: customer.customer_id })

            // Update peanut user with bridge customer id
            const updatedUser = await updateBridgeCustomerId(customer.customer_id)
            console.log('updatedUser:', updatedUser)

            recipientType === 'us' && setAddressRequired(true)
            setLoadingState('Idle')

            goToNext()
        } catch (error) {
            console.error('Error during the submission process:', error)

            setErrorState({ showError: true, errorMessage: 'An error occurred. Please try again later' })

            setLoadingState('Idle')
        } finally {
            setLoadingState('Idle')
        }
    }

    const handleSubmitLinkIban = async () => {
        const formData = accountFormWatch()
        const isFormValid = utils.validateAccountFormData(formData, setAccountFormError)

        if (!isFormValid) {
            console.log('Form is invalid')
            return
        }

        try {
            if (recipientType === 'iban') setLoadingState('Linking IBAN')
            else if (recipientType === 'us') setLoadingState('Linking account')

            const customerId = customerObject?.customer_id ?? user?.user?.bridge_customer_id
            const accountType = formData.type
            const accountDetails =
                accountType === 'iban'
                    ? {
                          accountNumber: formData.accountNumber,
                          bic: formData.BIC,
                          country: utils.getThreeCharCountryCodeFromIban(formData.accountNumber),
                      }
                    : { accountNumber: formData.accountNumber, routingNumber: formData.routingNumber }
            const address = {
                street: formData.street,
                city: formData.city,
                country: formData.country ?? 'BEL',
                state: formData.state,
                postalCode: formData.postalCode,
            }
            let accountOwnerName = offrampForm.name ?? user?.user?.full_name

            if (!customerId) {
                throw new Error('Customer ID is missing')
            }

            if (!accountOwnerName) {
                const bridgeCustomer = await utils.getCustomer(customerId)
                accountOwnerName = `${bridgeCustomer.first_name} ${bridgeCustomer.last_name}`
            }

            const data = await utils.createExternalAccount(
                customerId,
                accountType as 'iban' | 'us',
                accountDetails,
                address,
                accountOwnerName
            )

            const pAccount = await utils.createAccount(
                user?.user?.userId ?? '',
                customerId,
                data.id,
                accountType,
                formData.accountNumber.replaceAll(' ', ''),
                address
            )
            fetchUser()

            setPeanutAccount(pAccount)

            const liquidationAddressDetails = await utils.createLiquidationAddress(
                customerId,
                offrampChainAndToken.chain,
                offrampChainAndToken.token,
                data.id,
                recipientType === 'iban' ? 'sepa' : 'ach',
                recipientType === 'iban' ? 'eur' : 'usd'
            )

            setLiquidationAddress(liquidationAddressDetails)
            setActiveStep(3)
            setAddressRequired(false)
            setLoadingState('Idle')
        } catch (error) {
            console.error('Error during the submission process:', error)
            setErrorState({ showError: true, errorMessage: 'An error occurred. Please try again later' })

            setLoadingState('Idle')
        }
    }

    const renderComponent = () => {
        switch (activeStep) {
            case 0:
                return (
                    <div className="flex w-full flex-col items-start justify-center gap-2">
                        <>
                            <input
                                {...registerOfframp('name', { required: 'This field is required' })}
                                className={`custom-input custom-input-xs ${errors.name ? 'border border-red' : ''}`}
                                placeholder="Full name"
                                disabled={activeStep > 0}
                            />
                            {errors.name && <span className="text-h9 font-normal text-red">{errors.name.message}</span>}
                        </>
                        {/* TODO: make this not required if is already defined in user object */}

                        <input
                            {...registerOfframp('email', { required: 'This field is required' })}
                            className={`custom-input custom-input-xs ${errors.email ? 'border border-red' : ''}`}
                            placeholder="Email"
                            type="email"
                            disabled={activeStep > 0}
                        />
                        {errors.email && <span className="text-h9 font-normal text-red">{errors.email.message}</span>}

                        <input
                            {...registerOfframp('password', { required: 'This field is required' })}
                            className={`custom-input custom-input-xs ${errors.password ? 'border border-red' : ''}`}
                            placeholder="Password"
                            type="password"
                            disabled={activeStep > 0}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    handleEmail(watchOfframp())
                                }
                            }}
                        />
                        {errors.password && (
                            <span className="text-h9 font-normal text-red">{errors.password.message}</span>
                        )}

                        <button
                            onClick={() => {
                                handleEmail(watchOfframp())
                            }}
                            className="btn btn-purple h-8 w-full"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <div className="flex w-full flex-row items-center justify-center gap-2">
                                    <Loading /> {loadingState}
                                </div>
                            ) : (
                                'Next'
                            )}
                        </button>
                    </div>
                )

            case 1:
                return (
                    <div className="mb-2 flex flex-col items-center justify-center gap-2">
                        <button
                            onClick={() => {
                                handleTOSStatus()
                            }}
                            className="btn btn-purple h-8 w-full"
                        >
                            {isLoading ? 'Reopen TOS' : 'Open TOS'}
                        </button>
                        {isLoading && (
                            <span className="flex flex-row items-center justify-center gap-1">
                                <Loading />
                                Awaiting TOS confirmation
                            </span>
                        )}
                    </div>
                )

            case 2:
                return (
                    <div className="mb-2 flex flex-col items-center justify-center gap-2">
                        <button
                            onClick={() => {
                                handleKYCStatus()
                            }}
                            className="btn btn-purple h-8 w-full"
                        >
                            {isLoading ? 'Reopen KYC' : 'Open KYC'}
                        </button>
                        {isLoading && (
                            <span className="flex flex-row items-center justify-center gap-1">
                                <Loading />
                                Awaiting KYC confirmation
                            </span>
                        )}
                    </div>
                )

            case 3:
                return (
                    <div className="flex w-full flex-col items-start justify-center gap-2">
                        <input
                            {...registerAccount('accountNumber', {
                                required: 'This field is required',
                            })}
                            className={`custom-input ${accountErrors.accountNumber ? 'border border-red' : ''}`}
                            placeholder={recipientType === 'iban' ? 'IBAN' : 'Account number'}
                        />
                        {accountErrors.accountNumber && (
                            <span className="text-h9 font-normal text-red">{accountErrors.accountNumber.message}</span>
                        )}
                        {recipientType === 'iban' ? (
                            <>
                                <input
                                    {...registerAccount('BIC', {
                                        required: addressRequired ? 'This field is required' : false,
                                    })}
                                    className={`custom-input ${accountErrors.BIC ? 'border border-red' : ''}`}
                                    placeholder="BIC"
                                />
                                {accountErrors.BIC && (
                                    <span className="text-h9 font-normal text-red">{accountErrors.BIC.message}</span>
                                )}
                            </>
                        ) : (
                            <>
                                <input
                                    {...registerAccount('routingNumber', {
                                        required: addressRequired ? 'This field is required' : false,
                                    })}
                                    className={`custom-input ${accountErrors.routingNumber ? 'border border-red' : ''}`}
                                    placeholder="Routing number"
                                />
                                {accountErrors.routingNumber && (
                                    <span className="text-h9 font-normal text-red">
                                        {accountErrors.routingNumber.message}
                                    </span>
                                )}
                            </>
                        )}
                        {addressRequired && (
                            <div className="flex w-full flex-col items-start justify-center gap-2">
                                <input
                                    {...registerAccount('street', {
                                        required: addressRequired ? 'This field is required' : false,
                                    })}
                                    className={`custom-input ${accountErrors.street ? 'border border-red' : ''}`}
                                    placeholder="Your street and number"
                                />
                                {accountErrors.street && (
                                    <span className="text-h9 font-normal text-red">{accountErrors.street.message}</span>
                                )}

                                <div className="mx-0 flex w-full flex-row items-start justify-between gap-2">
                                    <div className="flex w-full flex-col items-start justify-center gap-2">
                                        <input
                                            {...registerAccount('city', {
                                                required: addressRequired ? 'This field is required' : false,
                                            })}
                                            className={`custom-input ${accountErrors.city ? 'border border-red' : ''}`}
                                            placeholder="Your city"
                                        />
                                        {accountErrors.city && (
                                            <span className="text-h9 font-normal text-red">
                                                {accountErrors.city.message}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex w-full flex-col items-center justify-center gap-2">
                                        <input
                                            {...registerAccount('postalCode', {
                                                required: addressRequired ? 'This field is required' : false,
                                            })}
                                            className={`custom-input ${accountErrors.postalCode ? 'border border-red' : ''}`}
                                            placeholder="Your postal code"
                                        />
                                        {accountErrors.postalCode && (
                                            <span className="text-h9 font-normal text-red">
                                                {accountErrors.postalCode.message}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="mx-0 flex w-full flex-row items-start justify-between gap-2">
                                    <div className="flex w-full flex-col items-start justify-center gap-2">
                                        <input
                                            {...registerAccount('state', {
                                                required: addressRequired ? 'This field is required' : false,
                                            })}
                                            className={`custom-input ${accountErrors.state ? 'border border-red' : ''}`}
                                            placeholder="Your state "
                                        />
                                        {accountErrors.state && (
                                            <span className="text-h9 font-normal text-red">
                                                {accountErrors.state.message}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex w-full flex-col items-center justify-center gap-2">
                                        <CountryDropdown
                                            value={accountFormWatch('country')}
                                            onChange={(value: any) => {
                                                setAccountFormValue('country', value, { shouldValidate: true })
                                                setAccountFormError('country', { message: undefined })
                                            }}
                                            error={accountErrors.country?.message}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                        <button
                            onClick={() => {
                                handleSubmitLinkIban()
                            }}
                            className="btn btn-purple h-8 w-full"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <div className="flex w-full flex-row items-center justify-center gap-2">
                                    <Loading /> {loadingState}
                                </div>
                            ) : (
                                'Confirm'
                            )}
                        </button>{' '}
                    </div>
                )
        }
    }

    return (
        <div>
            <div className="flex w-full flex-col items-center justify-center gap-6 px-2  text-center">
                <p className="text-h8 font-normal">
                    This is your first time using a bank account on peanut. You'll have to pass a brief KYC check to
                    proceed.
                </p>
                <Steps
                    variant={'circles'}
                    orientation="vertical"
                    colorScheme="purple"
                    activeStep={activeStep}
                    sx={{
                        '& .cui-steps__vertical-step': {
                            '&:last-of-type': {
                                paddingBottom: '0px',
                                gap: '0px',
                            },
                        },
                        '& .cui-steps__vertical-step-content': {
                            '&:last-of-type': {
                                minHeight: '8px',
                            },
                        },
                    }}
                >
                    {steps.map(({ label }, index) => (
                        <Step label={label} key={label}>
                            <div className="relative z-10 flex w-full items-center justify-center pr-[40px]">
                                {renderComponent()}
                            </div>
                        </Step>
                    ))}
                </Steps>

                <div className="flex w-full flex-col items-center justify-center gap-2">
                    {errorState.showError && errorState.errorMessage === 'KYC under review' ? (
                        <div className="text-center">
                            <label className=" text-h8 font-normal text-red ">
                                KYC is under review, we might need additional documents. Please reach out via{' '}
                                <a href="https://discord.gg/uWFQdJHZ6j" target="_blank" className="underline">
                                    discord
                                </a>{' '}
                                to finish the process.
                            </label>
                        </div>
                    ) : errorState.errorMessage === 'KYC rejected' ? (
                        <div className="text-center">
                            <label className=" text-h8 font-normal text-red ">
                                KYC has been rejected. Please reach out via{' '}
                                <a href="https://discord.gg/uWFQdJHZ6j" target="_blank" className="underline">
                                    {' '}
                                    discord{' '}
                                </a>{' '}
                                .
                            </label>
                        </div>
                    ) : (
                        <div className="text-center">
                            <label className=" text-h8 font-normal text-red ">{errorState.errorMessage}</label>
                        </div>
                    )}
                </div>
                <IframeWrapper
                    src={iframeOptions.src}
                    visible={iframeOptions.visible}
                    onClose={iframeOptions.onClose}
                    style={{ width: '100%', height: '500px', border: 'none' }}
                />
            </div>
        </div>
    )
}