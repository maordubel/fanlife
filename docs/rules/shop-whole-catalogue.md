# The whole Printify catalogue in the builder (owner, 12.11.2026)

"Give me an option for everything they have, smartly, simple to run and launch." The builder keeps its quick chips (poster, tote, tee, mug …) and opens **Everything Printify makes**: every catalogue product, sorted onto shelves (`groupOf`), searchable, up to 40 picked at once.

- A catalogue product is kind `more` with `blueprint:{id,title}`; its print rules come from its name (`catalogueSpec`): garments and bags get a chest-sized print on light colours, the rest is printed edge to edge.
- Its printer is chosen once per catalogue number, a European printer first (`PROVIDER_ORDER`), and kept in `settings.picked`.
- An uploaded picture is sent to Printify once for all the products chosen with it.
