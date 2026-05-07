import Image from "next/image";
import Link from "next/link";

const navigation = {
  product: [
    {name: 'JSON To CSV', href: 'https://www.jsontocsv.co'},
    {name: 'Photo Maker', href: 'https://photomaker.co'},
  ],
  legal: [
    {name: 'Privacy Policy', href: '/'},
    {name: 'Terms & Conditions', href: '/'},
  ]
}

export default function Footer({
                                 locale = '',
                                 description = '',
                                 footerText
                               }) {
  return (
    <footer className="bg-[#44403C] footer flex flex-col" aria-labelledby="footer-heading">
      <div className="mx-auto flex item-center max-w-7xl p-6 lg:px-8">
        <div className="xl:grid xl:grid-cols-4  xl:gap-8">
          <div className="space-y-1 xl:col-span-2">
            <a href={`/${locale}`}>
              <Image
                className="h-10"
                src="/feather-repeat.svg"
                width={32}
                height={32}
                alt="Unix Time Converter"
              />
            </a>
            <p className="text-sm text-white">
              {footerText.title}
            </p>
          <div className="text-sm text-white">
                <a href="/" className="inline-block font-normal text-white transition hover:text-blue-600 sm:pr-1 lg:pr-6 py-1.5 sm:py-2 pr-1">English</a>
                <a href="/zh" className="inline-block font-normal text-white transition hover:text-blue-600 sm:pr-1 lg:pr-6 py-1.5 sm:py-2 pr-1">简体中文</a>
                <a href="/pt" className="inline-block font-normal text-white transition hover:text-blue-600 sm:pr-1 lg:pr-6 py-1.5 sm:py-2 pr-1">Português</a>
                <a href="/de" className="inline-block font-normal text-white transition hover:text-blue-600 sm:pr-1 lg:pr-6 py-1.5 sm:py-2 pr-1">Deutsch</a>
          </div>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-8 xl:col-span-2 xl:mt-0">
            <div className="md:grid md:grid-cols-2 md:gap-8">
              <div>
                <div className="text-sm font-semibold leading-6 text-white"></div>
                <ul role="list" className="mt-6 space-y-4">
                </ul>
              </div>
              <div className="mt-10 md:mt-0">
                <div className="text-sm font-semibold leading-6 text-white">Community</div>
                <ul role="list" className="mt-6 space-y-4">
                    <li>
                        <Link href='https://devlist.carrd.co' className="text-sm leading-6 text-gray-300 hover:text-[#2d6ae0]" target='_blank'>
                        Devlist Carrd
                        </Link>
                    </li>
                    <li>
                        <Link href='https://dev.to/devlist' className="text-sm leading-6 text-gray-300 hover:text-[#2d6ae0]" target='_blank'>
                        Devlist Dev.to
                        </Link>
                    </li>
                    <li>
                        <Link href='https://www.producthunt.com/posts/jsonhome?embed=true&utm_source=badge-featured&utm_medium=badge&utm_souce=badge-jsonhome'
                         target='_blank'
                         className="text-sm leading-6 text-gray-300 hover:text-[#2d6ae0]">
                         Product Hunt
                        </Link>
                    </li>
                </ul>
              </div>
            </div>
            <div className="md:grid md:grid-cols-2 md:gap-8">
              <div>
                <div className="text-sm font-semibold leading-6 text-white">Product</div>
                <ul role="list" className="mt-6 space-y-4">
                  {navigation.product.map((item) => {
                      return (
                        <li key={item.name}>
                          <Link href={`${item.href}`}
                                target={"_blank"}
                                className="text-sm leading-6 text-gray-300 hover:text-[#2d6ae0]">
                            {item.name}
                          </Link>
                        </li>
                      )
                    }
                  )}
                </ul>
              </div>
              <div className="mt-10 md:mt-0">
                <div className="text-sm font-semibold leading-6 text-white">Legal</div>
                <ul role="list" className="mt-6 space-y-4">
                  {navigation.legal.map((item) => {
                      let hrefTo = `/${locale}${item.href}`;
                      if (locale == 'en') {
                        hrefTo = `${item.href}`;
                      }
                      return (
                        <li key={item.name}>
                          <Link href={`${hrefTo}`}
                                className="text-sm leading-6 text-gray-300 hover:text-[#2d6ae0]">
                            {item.name}
                          </Link>
                        </li>
                      )
                    }
                  )}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

    </footer>

  )
}
