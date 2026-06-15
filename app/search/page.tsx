import { SearchClient } from "@/components/SearchClient"
import { petroData } from "@/lib/data"

export default function SearchPage() {
  return (
    <main>
      <section className="page-head">
        <span className="eyebrow">Global lookup</span>
        <h1>Search across materials, routes, licensors, suppliers, and HSK codes.</h1>
        <p className="lead">Results link into material detail pages where possible, with route and company matches retained as searchable context.</p>
      </section>
      <SearchClient index={petroData.searchIndex} />
    </main>
  )
}
