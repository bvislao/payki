'use client'
import { useState } from 'react'
import { QRCodeCanvas } from 'qrcode.react'

export default function QRModal({ value }: { value: string }) {
    const [open, setOpen] = useState(false)
    return (
        <>
            <button className="btn w-full" type="button" onClick={() => setOpen(true)}>Mostrar QR</button>
            {open && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="card p-6 max-w-sm w-full space-y-4">
                        <div className="flex justify-between items-center">
                            <h4 className="font-semibold">Cobro</h4>
                            <button className="btn-outline" onClick={() => setOpen(false)}>Cerrar</button>
                        </div>
                        <div className="flex items-center justify-center">
                            <QRCodeCanvas value={value} size={256} />
                        </div>
                        <p className="text-xs break-all">{value}</p>
                    </div>
                </div>
            )}
        </>
    )
}
