import { Fragment } from 'react';
import Image from 'next/image';
import { EmailIcon, InstagramIcon, WhatsAppIcon, YouTubeIcon } from './FooterIcons';

// Phone, email and YouTube as in the v1 Invitation contact block. Instagram
// is the brand account.
const CONTACT = [
  { Icon: WhatsAppIcon, text: '+91 7075985970', href: 'https://wa.me/917075985970', label: 'WhatsApp HIM LIFE SCHOOL' },
  { Icon: EmailIcon, text: 'mentorshipbyhim@gmail.com', href: 'mailto:mentorshipbyhim@gmail.com', label: 'Email HIM LIFE SCHOOL' },
  { Icon: InstagramIcon, text: '@himlifeschool', href: 'https://www.instagram.com/himlifeschool/', label: 'HIM LIFE SCHOOL on Instagram', external: true },
  { Icon: YouTubeIcon, text: '@HIMLIFESCHOOL', href: 'https://www.youtube.com/@HIMLIFESCHOOL', label: 'HIM LIFE SCHOOL on YouTube', external: true },
];

/** /story's footer: who we are, how to reach us, and what the page keeps. */
export default function StoryFooter() {
  return (
    <footer className="relative w-full border-t border-hls-mist/15 bg-hls-black px-5 pb-10 pt-14 md:px-10 md:pt-16 lg:px-0">
      {/* Phones and tablets: brand, links, privacy, ©. From 1024px: links and
          small print on the left (62%), the brand on the right (38%). The four
          links don't fit one row in 62% of the frame, so they stay two by two. */}
      <div className="story-frame mx-auto grid w-full max-w-[1200px] gap-10 font-mono text-[12px] leading-[1.7] tracking-[0.06em] text-hls-mist lg:max-w-none lg:grid-cols-[minmax(0,62fr)_minmax(0,38fr)] lg:items-center lg:gap-12">
        <div className="flex flex-col items-start gap-4 lg:order-2 lg:items-end lg:text-right">
          <Image
            src="/hls_crest.png"
            alt=""
            width={706}
            height={930}
            sizes="(min-width: 1024px) 152px, 73px"
            className="h-[96px] w-auto lg:h-[clamp(120px,12vw,200px)]"
          />
          <div>
            <p className="font-medium uppercase tracking-[0.2em] text-hls-platinum lg:text-[14px]">HIM LIFE SCHOOL</p>
            <p className="uppercase tracking-[0.2em]">Learn to live</p>
            <p className="mt-3">Hyderabad, India</p>
          </div>
        </div>

        <div className="min-w-0 lg:order-1">
          {/* Each name keeps the visible value, so voice control can match
              what's on screen. */}
          <ul className="grid w-full grid-cols-2 gap-x-4 gap-y-2 md:w-fit md:gap-x-10">
            {CONTACT.map(({ Icon, text, href, label, external }) => (
              <li key={href} className="min-w-0">
                <a
                  href={href}
                  aria-label={`${label}, ${text}`}
                  {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                  className="group inline-flex min-h-[44px] max-w-full items-center gap-2.5 text-hls-platinum transition-colors duration-200 hover:text-white"
                >
                  <Icon className="text-hls-platinum/80 transition-colors duration-200 group-hover:text-hls-signal group-focus-visible:text-hls-signal" />
                  <span className="min-w-0 text-[clamp(11px,calc(10.046px+0.254vw),12px)] tracking-[0.02em] [overflow-wrap:anywhere] md:tracking-[0.06em]">
                    {/* Phones wrap the email at the @, not mid-word. */}
                    {text.split(/(?=@gmail)/).map((part, i) => (
                      <Fragment key={i}>
                        {i ? <wbr /> : null}
                        {part}
                      </Fragment>
                    ))}
                  </span>
                </a>
              </li>
            ))}
          </ul>

          <p className="mt-8 max-w-[68ch]">
            This page saves nothing you type. If you share your number on the next page, it is used only to call
            you about your attempt.
          </p>
          <p className="mt-6 uppercase tracking-[0.18em]">© 2026 HIM LIFE SCHOOL</p>
        </div>
      </div>
    </footer>
  );
}
