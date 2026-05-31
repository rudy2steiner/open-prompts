'use client'
import {useEffect, useState} from 'react'
import {Dialog} from '@headlessui/react'
import {Bars3Icon, XMarkIcon} from '@heroicons/react/24/outline'
import {GlobeAltIcon} from '@heroicons/react/24/outline'
import {Fragment} from 'react'
import {Menu, Transition} from '@headlessui/react'
import {ChevronDownIcon} from '@heroicons/react/20/solid'
import Link from "next/link";
import {languages} from "~/config";
import { buildLocaleHref, parseOpLocale, persistOpLocale, type OpLocale } from '~/lib/op-locale';
import {useCommonContext} from '~/context/common-context'
import LoadingModal from "./LoadingModal";
import Image from "next/image";
import GeneratingModal from "~/components/GeneratingModal";
import { FaGithub } from "react-icons/fa";

type TopMenuItem = { name: string; href: string };
type SocialItem = { name: string; href: string; icon: any };

const navigation: { topMenu: TopMenuItem[]; social: SocialItem[] } = {
  topMenu: [],
  social: [],
};

export default function Header({
                                 locale = '',
                                 page = '',
                                 indexLanguageText
                               }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const {setShowGeneratingModal} = useCommonContext();
  const {setShowLoadingModal} = useCommonContext();

  const checkLocalAndLoading = (lang) => {
    if (locale != lang) {
      setShowLoadingModal(true);
    }
  }

  useEffect(() => {
    const parsed = parseOpLocale(locale);
    if (parsed) persistOpLocale(parsed);
  }, [locale]);

  const pageSuffix = page ? `/${page}` : '';

  return (
    <header className="sticky top-0 bg-[#44403C] z-20 w-full">
      <LoadingModal loadingText={indexLanguageText.loadingText}/>
      <GeneratingModal generatingText={indexLanguageText.generateText}/>
      <nav className="mx-auto flex max-w-7xl items-center justify-between p-6 lg:px-8" aria-label="Global">
        <div className="flex min-w-0 flex-1 items-center">
          <a
            href={buildLocaleHref(locale)}
            className="-m-1.5 flex min-w-0 items-center gap-2 p-1.5"
            onClick={() => setShowLoadingModal(true)}
          >
            <Image
              className="h-8 w-8 shrink-0"
              src="/feather-repeat.svg"
              width={32}
              height={32}
              alt=""
            />
            <span className="truncate font-semibold text-sm text-white sm:text-base">
              Unix Time Converter
            </span>
          </a>
        </div>
        <div className="flex lg:hidden">
          <button
            type="button"
            className="-m-2.5 inline-flex items-center justify-center rounded-md p-2.5 text-white"
            onClick={() => setMobileMenuOpen(true)}
          >
            <span className="sr-only">Open main menu</span>
            <Bars3Icon className="h-6 w-6" aria-hidden="true"/>
          </button>
        </div>
        <div className="hidden lg:flex lg:gap-x-12">
          {navigation.topMenu.map((item) => (
            <a
              key={item.name}
              href={`/${locale}${item.href}`}
              onClick={() => setShowLoadingModal(true)}
              className="text-sm font-semibold leading-6 text-white hover:text-blue-500">
              {item.name}
            </a>
          ))}
        </div>
        <div className="flex flex-1 justify-end mr-2 items-center gap-3">
          <a
            href="https://github.com/rudy2steiner/open-prompts"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-white/90 hover:text-white hover:bg-white/10"
            aria-label="GitHub repository"
            title="GitHub"
          >
            <FaGithub className="h-5 w-5" aria-hidden="true" />
            <span className="hidden sm:inline text-sm font-semibold">GitHub</span>
          </a>
          {navigation.social.map((item) => (
            <a key={item.name} href={item.href} className="text-gray-500 hover:text-gray-400">
              <span className="sr-only">{item.name}</span>
              <item.icon className="h-6 w-6" aria-hidden="true"/>
            </a>
          ))}
        </div>
        <Menu as="div" className="relative inline-block text-left">
          <div>
            <Menu.Button
              className="inline-flex w-full justify-center gap-x-1.5 border border-[rgba(255,255,255,0.5)] rounded-md px-3 py-2 text-sm font-semibold text-white hover:border-[rgba(255,255,255,0.9)]">
              <GlobeAltIcon className="w-5 h-5 text-white"/>{locale == 'default' ? 'EN' : locale.toUpperCase()}
              <ChevronDownIcon className="-mr-1 h-5 w-5 text-white" aria-hidden="true"/>
            </Menu.Button>
          </div>
          <Transition
            as={Fragment}
            enter="transition ease-out duration-100"
            enterFrom="transform opacity-0 scale-95"
            enterTo="transform opacity-100 scale-100"
            leave="transition ease-in duration-75"
            leaveFrom="transform opacity-100 scale-100"
            leaveTo="transform opacity-0 scale-95"
          >
            <Menu.Items
              className="absolute right-0 z-10 mt-2 w-26 origin-top-right divide-y divide-gray-100 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
              <div className="py-1">
                {
                  languages.map((item) => {
                    const hrefValue = buildLocaleHref(item.lang, pageSuffix);
                    return (
                      <Menu.Item key={item.lang}>
                        <Link
                          href={hrefValue}
                          onClick={() => {
                            persistOpLocale(item.lang as OpLocale);
                            checkLocalAndLoading(item.lang);
                          }}
                        >
                              <span
                                className={'text-gray-700 block px-4 py-2 text-sm hover:text-[#2d6ae0]'}
                              >
                                {item.language}
                              </span>
                        </Link>
                      </Menu.Item>
                    )
                  })
                }
              </div>
            </Menu.Items>
          </Transition>
        </Menu>
      </nav>
      <Dialog as="div" className="lg:hidden" open={mobileMenuOpen} onClose={setMobileMenuOpen}>
        <div className="fixed inset-0 z-10"/>
        <Dialog.Panel
          className="fixed inset-y-0 right-0 z-10 w-full overflow-y-auto bg-white px-6 py-6 sm:max-w-sm sm:ring-1 sm:ring-gray-900/10">
          <div className="flex items-center justify-between gap-2">
            <a
              href={buildLocaleHref(locale)}
              className="-m-1.5 flex min-w-0 flex-1 items-center gap-2 p-1.5"
              onClick={() => setShowLoadingModal(true)}
            >
              <Image
                className="h-8 w-8 shrink-0"
                src="/feather-repeat.svg"
                width={32}
                height={32}
                alt=""
              />
              <span className="truncate font-semibold text-base text-stone-900">
                Unix Time Converter
              </span>
            </a>
            <button
              type="button"
              className="-m-2.5 rounded-md p-2.5 text-gray-700"
              onClick={() => setMobileMenuOpen(false)}
            >
              <span className="sr-only">Close menu</span>
              <XMarkIcon className="h-6 w-6" aria-hidden="true"/>
            </button>
          </div>
          <div className="mt-6 flow-root">
            <div className="-my-6 divide-y divide-gray-500/10">
              <div className="space-y-2 py-6">
                {navigation.topMenu.map((item) => (
                  <a
                    key={item.name}
                    href={`/${locale}${item.href}`}
                    onClick={() => setShowLoadingModal(true)}
                    className="-mx-3 block rounded-lg px-3 py-2 text-base font-semibold leading-7 text-gray-900 hover:text-blue-500"
                  >
                    {item.name}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </Dialog.Panel>
      </Dialog>
    </header>
  )
}
