
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: false, // Desabilita o Strict Mode
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'upload.wikimedia.org',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'www.aljazeera.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'ichef.bbci.co.uk',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'static01.nyt.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'microsites-live-backend.cfr.org',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'i.guim.co.uk',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'dl6pgk4f88hky.cloudfront.net',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'conteudo.imguol.com.br',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https', // Added for Guerra Civil da Somália
        hostname: 'img.lemde.fr',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https', // Added for Conflitos na RDC
        hostname: 'www.vaticannews.va',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https', // Added for Conflitos na Nigéria & Afeganistão
        hostname: 'www.hrw.org',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https', // Added for Conflito na Colômbia
        hostname: 'agenciabrasil.ebc.com.br',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https', // Added for Conflito na Colômbia (outro host)
        hostname: 'imagens.ebc.com.br',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'http', // Added for Guerra Civil no Iêmen (Washington Post usa http para o link fornecido)
        hostname: 'img.washingtonpost.com',
        port: '',
        pathname: '/**',
      }
    ],
  },
};

export default nextConfig;
