'use client'
import { QRCodeCanvas } from 'qrcode.react'

export default function QRModal({ value }: { value: string }) {
    return (
        <div className="card p-4 grid place-items-center">
            <QRCodeCanvas value={value} size={240} includeMargin/>
        </div>
    )
}