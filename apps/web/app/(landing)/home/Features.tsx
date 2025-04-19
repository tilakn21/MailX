import { type LucideIcon, Sparkles, ShieldHalfIcon, ReplyIcon, ListStartIcon, SparklesIcon, MousePointer2Icon, BarChart2Icon, BellIcon, BlocksIcon, LineChart } from "lucide-react";

const allFeatures = [
  {
    title: "Assistant X",
    description: "Your AI command center that understands natural language",
    features: [
      {
        name: "Natural Language Control",
        description: "Simply tell your inbox what to do in plain English - archive promos, show client emails, and more.",
        icon: Sparkles,
      },
      {
        name: "Smart Organization",
        description: "Automatically sorts, tags, and moves emails based on your preferences.",
        icon: BlocksIcon,
      },
      {
        name: "Personalized Workflow",
        description: "Adapts to your email management style for maximum efficiency.",
        icon: SparklesIcon,
      },
    ],
  },
  {
    title: "Easy Cleanup",
    description: "Declutter your inbox instantly, no more endless scrolling.",
    features: [
      {
        name: "One-Click Cleanup",
        description: "Quickly unsubscribe from newsletters and promotional emails with a single click.",
        icon: MousePointer2Icon,
      },
      {
        name: "Smart Filtering",
        description: "Intelligently identifies and organizes promotional content out of your main inbox.",
        icon: ShieldHalfIcon,
      },
      {
        name: "Cold Email Shield",
        description: "Automatically blocks and filters unwanted sales pitches and spam.",
        icon: ShieldHalfIcon,
      },
    ],
  },
  {
    title: "Smart Features",
    description: "AI-powered tools for efficient email management",
    features: [
      {
        name: "Focus Reply",
        description: "Highlights emails needing responses and integrates with Gmail labels.",
        icon: ReplyIcon,
      },
      {
        name: "To-Do Spotter",
        description: "Automatically detects and categorizes action items from your emails.",
        icon: ListStartIcon,
      },
      {
        name: "Quick Digest",
        description: "Instantly summarizes long emails to their key points.",
        icon: SparklesIcon,
      },
    ],
  },
  {
    title: "Analytics & Insights",
    description: "Understand and optimize your email workflow",
    features: [
      {
        name: "Email Analytics",
        description: "Track who emails you most and identify patterns in your inbox.",
        icon: BarChart2Icon,
      },
      {
        name: "Smart Notifications",
        description: "Get intelligent alerts for important emails and follow-ups.",
        icon: BellIcon,
      },
      {
        name: "Performance Tracking",
        description: "Monitor your email efficiency and response times.",
        icon: LineChart,
      },
    ],
  },
];

function FeatureSection({ title, description, features }: {
  title: string;
  description: string;
  features: {
    name: string;
    description: string;
    icon: LucideIcon;
  }[];
}) {
  return (
    <div className="lg:w-1/2 px-8 pb-12">
      <div className="mx-auto max-w-2xl">
        <h2 className="text-base font-semibold leading-7 text-orange-500">{title}</h2>
        <p className="mt-2 text-3xl font-bold tracking-tight text-white bg-gradient-to-b from-white via-white to-[#636363] bg-clip-text text-transparent sm:text-4xl">
          {description}
        </p>
      </div>
      <div className="mx-auto mt-6 max-w-2xl">
        <dl className="grid gap-y-8">
          {features.map((feature) => (
            <div key={feature.name} className="relative pl-9">
              <dt className="inline font-semibold text-white">
                <feature.icon
                  className="absolute left-1 top-1 h-5 w-5 text-orange-500"
                  aria-hidden="true"
                />
                {feature.name}
              </dt>
              <dd className="inline-block mt-2 text-base leading-7 text-gray-400">
                {feature.description}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}

export function FeaturesHome() {
  return (
    <div className="bg-black py-16">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap">
          {allFeatures.map((section, index) => (
            <FeatureSection key={section.title} {...section} />
          ))}
        </div>
      </div>
    </div>
  );
}
