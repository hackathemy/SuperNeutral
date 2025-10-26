import Link from "next/link";

interface DifferentiatorCardProps {
  icon: string;
  title: string;
  before: string;
  after: string;
  link: string;
}

export default function DifferentiatorCard({ icon, title, before, after, link }: DifferentiatorCardProps) {
  return (
    <Link href={link}>
      <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer h-full group hover:scale-105">
        <div className="text-6xl mb-4 group-hover:scale-110 transition-transform duration-300 text-center">
          {icon}
        </div>
        <h3 className="text-xl font-bold mb-6 text-center text-gray-800 dark:text-gray-100">
          {title}
        </h3>

        {/* Before Section */}
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
          <div className="flex items-start gap-2">
            <span className="text-red-500 text-xl flex-shrink-0">❌</span>
            <div>
              <div className="text-xs text-red-600 dark:text-red-400 font-semibold mb-1">기존 방식</div>
              <p className="text-sm text-gray-700 dark:text-gray-300">{before}</p>
            </div>
          </div>
        </div>

        {/* After Section */}
        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
          <div className="flex items-start gap-2">
            <span className="text-green-500 text-xl flex-shrink-0">✅</span>
            <div>
              <div className="text-xs text-green-600 dark:text-green-400 font-semibold mb-1">SuperNeutral</div>
              <p className="text-sm text-gray-700 dark:text-gray-300">{after}</p>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center text-indigo-600 dark:text-indigo-400 font-medium group-hover:text-indigo-700 dark:group-hover:text-indigo-300 transition">
          자세히 보기 →
        </div>
      </div>
    </Link>
  );
}
