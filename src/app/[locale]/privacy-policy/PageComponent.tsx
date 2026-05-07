import Header from '~/components/Header';
import HeadInfo from "~/components/HeadInfo";

const PageComponent = ({
                         locale = '',
                         privacyPolicyLanguageText,
                         footerLanguageText,
                         indexLanguageText,
                       }) => {

  return (
    <>
      <HeadInfo
        title={privacyPolicyLanguageText.title}
        description={privacyPolicyLanguageText.description}
        locale={locale}
        page={"/privacy-policy"}
      />
      <Header
        locale={locale}
        page={'privacy-policy'}
        indexLanguageText={indexLanguageText}
      />
      <main className="w-[95%] md:w-[65%] lg:w-[55%] 2xl:w-[45%] mx-auto h-full my-8">
        <div className="p-6 prose mx-auto text-gray-300">
          <h1 className="text-3xl font-extrabold pb-6 text-white">
            {privacyPolicyLanguageText.h1}
          </h1>
          <p>{privacyPolicyLanguageText.date}</p>
          <p>{privacyPolicyLanguageText.desc}</p>
          <h4 className={"text-white font-bold"}>{privacyPolicyLanguageText.h4_1}</h4>
          <p>{privacyPolicyLanguageText.h4_1_pa}</p>
          <p>{privacyPolicyLanguageText.h4_1_pb}</p>
          <h4 className={"text-white font-bold"}>{privacyPolicyLanguageText.h4_2}</h4>
          <p>{privacyPolicyLanguageText.h4_2_p}</p>
          <h4 className={"text-white font-bold"}>{privacyPolicyLanguageText.h4_3}</h4>
          <p>{privacyPolicyLanguageText.h4_3_p}</p>
          <h4 className={"text-white font-bold"}>{privacyPolicyLanguageText.h4_4}</h4>
          <p>{privacyPolicyLanguageText.h4_4_p}</p>
          <h4 className={"text-white font-bold"}>{privacyPolicyLanguageText.h4_5}</h4>
          <p>{privacyPolicyLanguageText.h4_5_p}</p>
          <h4 className={"text-white font-bold"}>{privacyPolicyLanguageText.h4_6}</h4>
          <p>
            {privacyPolicyLanguageText.h4_6_p}{" "}<a href="mailto:hi@sorawebui.com" className={"text-white"}>hi@sorawebui.com</a>.
          </p>
        </div>
      </main>
      <footer className="mt-10 border-t border-[var(--border)] px-6 py-8">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div className="text-sm text-[var(--text2)]">{footerLanguageText?.title}</div>
          <div className="flex flex-wrap gap-5 text-xs text-[var(--text3)]">
            <a
              href="https://github.com/rudy2steiner/open-prompts"
              className="hover:text-[var(--text2)]"
              target="_blank"
              rel="noreferrer"
            >
              GitHub
            </a>
            <a href={`/${locale}/terms-of-service`} className="hover:text-[var(--text2)]">
              Terms
            </a>
            <a href={`/${locale}/privacy-policy`} className="hover:text-[var(--text2)]">
              Privacy
            </a>
          </div>
        </div>
      </footer>
    </>
  )
}

export default PageComponent
