'use client'
import Link from 'next/link'

export default function Footer() {
    return (
        <footer className="container py-8 text-xs text-center text-gray-500">
            Hecho con <span aria-label="amor" title="amor">❤</span> —{' '}
            <Link
                href="https://github.com/bvislao/payki"
                className="underline hover:opacity-80"
                target="_blank" rel="noopener noreferrer"
            >
                Código GitHub
            </Link>
            {'  '} © {new Date().getFullYear()} PAYKI
        </footer>)
}