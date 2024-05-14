import Icon from '../Icon'
import { useEffect, useState } from 'react'
import * as utils from '@/utils'
interface IFileUploadInputProps {
    attachmentOptions: {
        fileUrl: string | undefined
        message: string | undefined
    }
    setAttachmentOptions: (options: { fileUrl: string | undefined; message: string | undefined }) => void
}

export const FileUploadInput = ({ attachmentOptions, setAttachmentOptions }: IFileUploadInputProps) => {
    const [fileType, setFileType] = useState<string>('')

    const handleFileChange = (e: any) => {
        const file = e.target.files[0]
        if (file) {
            const url = URL.createObjectURL(file)

            setAttachmentOptions({ message: attachmentOptions.message, fileUrl: url })
        }
    }

    useEffect(() => {
        if (attachmentOptions.fileUrl) {
            fetch(attachmentOptions.fileUrl)
                .then((response) => response.blob())
                .then((blob) => {
                    setFileType(blob.type)
                })
                .catch((error) => {
                    console.error('Error fetching the blob from URL:', error)
                    setFileType('') // Reset or handle the error state
                })
        }
    }, [attachmentOptions.fileUrl])

    return (
        <div className="flex h-12 w-full max-w-96 flex-row items-center justify-center gap-2 border border-n-1 px-4 py-2">
            <div>
                <input type="file" onChange={handleFileChange} className="hidden" id="file-input" />
                <label htmlFor="file-input" className="cursor-pointer">
                    {attachmentOptions.fileUrl ? (
                        utils.checkifImageType(fileType) ? (
                            <img src={attachmentOptions.fileUrl} alt="" className="h-8 w-8" />
                        ) : (
                            <Icon name="check" className="h-4 w-4" />
                        )
                    ) : (
                        <Icon name="paperclip" className="h-4 w-4" />
                    )}
                </label>
            </div>
            <input
                placeholder="Add reference or upload file (optional)"
                className="h-full w-full focus:border-none focus:outline-none"
                value={attachmentOptions.message}
                maxLength={140}
                onChange={(e) => setAttachmentOptions({ message: e.target.value, fileUrl: attachmentOptions.fileUrl })}
            />{' '}
        </div>
    )
}

export default FileUploadInput