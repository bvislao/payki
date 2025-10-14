'use client'
import { useState } from 'react'
import QRCode from 'react-qr-code'

export default function QRModal({
                                    value,
                                    title = 'Código QR'
                                }: { value: string; title?: string }) {
    const [open, setOpen] = useState(false)

    return (
        <>
            <button className="btn w-full" onClick={() => setOpen(true)}>
                Mostrar QR
            </button>

            {open && (
                <div
                    className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4"
                    onClick={() => setOpen(false)}
                    role="dialog"
                    aria-modal="true"
                >
                    <div
                        className="w-full max-w-sm rounded-2xl bg-white p-4 shadow-xl dark:bg-gray-900"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="mb-3 text-center text-lg font-semibold">{title}</div>
                        <div className="rounded-xl bg-white p-4 shadow-inner dark:bg-white">
                            <QRCode value={value} size={220} />
                        </div>
                        <div className="mt-3 break-all rounded-md bg-gray-100 p-2 text-[10px] text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                            {value}
                        </div>
                        <div className="mt-3 flex gap-2">
                            <button
                                className="btn-outline w-full"
                                onClick={() => {
                                    navigator.clipboard?.writeText(value)
                                }}
                            >
                                Copiar payload
                            </button>
                            <button className="btn w-full" onClick={() => setOpen(false)}>
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
