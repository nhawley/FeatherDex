# FeatherWiki Pokédex Import Instructions

This package contains a complete Pokédex database for FeatherWiki with all 151 Generation I Pokémon.

## What's Included
- 151 individual Pokémon pages (001-151)
- 1 master index page with navigation
- Complete stats, abilities, evolution chains, and descriptions
- Pokémon sprites linked from PokeAPI
- Type filtering and navigation

## Import Methods

### Method 1: Individual Page Import
1. Open your FeatherWiki
2. For each `.md` file in this folder:
   - Create a new page
   - Copy the entire contents of the .md file
   - Paste into the page editor
   - Save

### Method 2: Bulk Import (if FeatherWiki supports it)
Look for import/batch features in your FeatherWiki installation.

### Method 3: Manual JSON Import
If your FeatherWiki has JSON import, use `pokemon_complete.json`

## Recommended Import Order
1. Start with `000_index.md` - this is your main navigation page
2. Then import Pokémon in numerical order (001-151)

## Features Included

### Each Pokémon Page Has:
- Pokédex number and name
- Sprite image (auto-loaded from PokeAPI)
- Type(s) with visual badges
- Pokédex description
- Complete base stats (HP, Attack, Defense, Sp.Atk, Sp.Def, Speed)
- Physical attributes (height, weight, category)
- Abilities list
- Evolution chain with clickable links
- Previous/Next navigation

### Index Page Features:
- Progress tracker (0/151 caught)
- Browse all Pokémon by number
- Filter by type (18 types)
- Organized in groups of 10

## Customization Tips

### Adding "Caught" Status:
In each Pokémon's YAML frontmatter, change:
```yaml
caught: false
```
to:
```yaml
caught: true
```

### Tracking Progress:
Update the index page's progress counter manually as you catch Pokémon.

### Adding Notes:
Add a "## Notes" section at the bottom of any Pokémon page for personal observations.

### Adding Location Data:
Add a "## Locations" section with where to find each Pokémon in games.

## Template Structure

The YAML frontmatter at the top of each file contains structured data:
- `id`: Pokédex number (001-151)
- `name`: Pokémon name
- `types`: Array of types
- `caught`: Boolean tracking status
- `stats`: Complete base stat object
- `evolution_from`/`evolution_to`: Evolution chain IDs
- `evolution_level`: Level requirement (or null)
- `height`/`weight`: Physical measurements
- `category`: Pokémon category

## Troubleshooting

**Images not showing?**
- Images are loaded from PokeAPI's sprite repository
- Requires internet connection
- Alternative: Download sprites locally and update image paths

**Links not working?**
- Make sure page IDs match the format `001`, `002`, etc.
- Check that hashtag navigation is supported in your FeatherWiki

**Evolution chains broken?**
- Verify all Pokémon in the chain are imported
- Check that page naming matches the linking format

## Enhancement Ideas

Once imported, you can extend this Pokédex with:
1. Move lists for each Pokémon
2. Type effectiveness charts
3. Breeding information
4. Shiny sprite variants
5. Regional variant pages
6. Team builder pages
7. Battle strategy notes
8. Capture location maps
9. Item requirements for special evolutions
10. Pokémon team comparison tools

Enjoy your FeatherWiki Pokédex! 🔴⚪
