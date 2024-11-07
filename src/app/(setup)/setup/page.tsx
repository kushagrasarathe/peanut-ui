'use client'

import { StepTransition } from '@/components/Setup/components/StepTransition'
import { useSetupFlow } from '@/components/Setup/context/SetupFlowContext'
import { twMerge } from 'tailwind-merge'

import peanutClub from '@/assets/peanut/peanut-club.png'
import starImage from '@/assets/icons/star.png'

const SetupPage = () => {
    const { currentStep, direction, step } = useSetupFlow()

    const starPositions = [
        'left-[10%] animate-rock-delay-1 top-[15%] h-16 w-16',
        'left-[50%] animate-rock-delay-2 bottom-[0%] h-8 w-8',
        'right-[10%] animate-rock top-[10%] h-12 w-12',
    ]

    return (
        <div className={twMerge('flex h-screen flex-col bg-opacity-100 p-6 transition-all', step.containerClassname)}>
            <div className="mg:1/3 mx-auto flex h-full w-full flex-col gap-8 md:w-1/2 lg:gap-12">
                <div className="flex h-[100px] flex-col gap-4">
                    <h1 className="text-center text-5xl font-bold">{step.title}</h1>
                    <p className="text-center">{step.description}</p>
                </div>
                <div className="relative flex flex-grow flex-row items-center justify-center">
                    {starPositions.map((positions, index) => (
                        <img
                            key={index}
                            src={starImage.src}
                            alt="Star"
                            className={twMerge(positions, 'absolute z-[11]')}
                        />
                    ))}
                    <img src={peanutClub.src} className="z-10 aspect-square h-full scale-75 object-contain" />
                </div>
                <div className="relative overflow-hidden">
                    <StepTransition step={currentStep} direction={direction}>
                        <step.component />
                    </StepTransition>
                </div>
            </div>
        </div>
    )
}

export default SetupPage
