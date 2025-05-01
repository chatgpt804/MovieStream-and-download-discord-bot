require("dotenv").config()
const {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ComponentType,
} = require("discord.js")
const { createClient } = require("@supabase/supabase-js")

// Initialize Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Channel, Partials.Message],
})

// Initialize Supabase client
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

// Bot ready event
client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`)

  // Register slash commands
  const commands = [
    {
      name: "movie",
      description: "Search for a movie",
      options: [
        {
          name: "title",
          description: "Movie title to search for",
          type: 3, // STRING
          required: true,
        },
      ],
    },
    {
      name: "series",
      description: "Search for a TV series",
      options: [
        {
          name: "title",
          description: "Series title to search for",
          type: 3, // STRING
          required: true,
        },
      ],
    },
  ]

  client.application.commands
    .set(commands)
    .then(() => console.log("Slash commands registered"))
    .catch(console.error)
})

// Handle interactions (slash commands, buttons, select menus)
client.on("interactionCreate", async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      // Handle slash commands
      if (interaction.commandName === "movie") {
        await handleMovieCommand(interaction)
      } else if (interaction.commandName === "series") {
        await handleSeriesCommand(interaction)
      }
    } else if (interaction.isButton()) {
      // Handle button interactions
      if (interaction.customId.startsWith("movie_stream_")) {
        const movieId = interaction.customId.replace("movie_stream_", "")
        await sendMovieStreamLink(interaction, movieId)
      } else if (interaction.customId.startsWith("movie_download_")) {
        const movieId = interaction.customId.replace("movie_download_", "")
        await sendMovieDownloadLink(interaction, movieId)
      } else if (interaction.customId.startsWith("episode_stream_")) {
        const episodeId = interaction.customId.replace("episode_stream_", "")
        await sendEpisodeStreamLink(interaction, episodeId)
      } else if (interaction.customId.startsWith("episode_download_")) {
        const episodeId = interaction.customId.replace("episode_download_", "")
        await sendEpisodeDownloadLink(interaction, episodeId)
      }
    } else if (interaction.isStringSelectMenu()) {
      // Handle select menu interactions
      if (interaction.customId === "select_season") {
        await handleSeasonSelect(interaction)
      } else if (interaction.customId === "select_episode") {
        await handleEpisodeSelect(interaction)
      }
    }
  } catch (error) {
    console.error("Error handling interaction:", error)

    // Try to respond to the interaction if it hasn't been responded to yet
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: "An error occurred while processing your request.",
        ephemeral: true,
      })
    }
  }
})

// Handle movie command
async function handleMovieCommand(interaction) {
  const searchQuery = interaction.options.getString("title")

  // Defer reply to give us time to fetch data
  await interaction.deferReply()

  // Search for movie in Supabase
  const { data: movies, error } = await supabase.from("movies").select("*").ilike("title", `%${searchQuery}%`).limit(1)

  if (error) {
    console.error("Supabase error:", error)
    return interaction.editReply("An error occurred while searching for the movie.")
  }

  if (!movies || movies.length === 0) {
    return interaction.editReply(`No movies found matching "${searchQuery}".`)
  }

  const movie = movies[0]

  // Create embed for public reply
  const embed = new EmbedBuilder()
    .setTitle(movie.title)
    .setDescription(movie.description)
    .setColor(0x9b59b6)
    .setImage(movie.poster_url)
    .setTimestamp()

  // Create buttons for DM
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`movie_stream_${movie.id}`).setLabel("Stream").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`movie_download_${movie.id}`).setLabel("Download").setStyle(ButtonStyle.Secondary),
  )

  // Send public reply
  await interaction.editReply({
    embeds: [embed],
    components: [row],
  })
}

// Send movie stream link via DM
async function sendMovieStreamLink(interaction, movieId) {
  await interaction.deferReply({ ephemeral: true })

  try {
    // Get movie data
    const { data: movie, error } = await supabase.from("movies").select("*").eq("id", movieId).single()

    if (error) throw error

    // Try to send DM
    try {
      const user = await client.users.fetch(interaction.user.id)

      // Create screenshots carousel if available
      const components = []
      if (movie.screenshots && movie.screenshots.length > 0) {
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("prev_screenshot").setLabel("Previous").setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId("next_screenshot").setLabel("Next").setStyle(ButtonStyle.Secondary),
        )
        components.push(row)
      }

      // Create embed for DM
      const embed = new EmbedBuilder()
        .setTitle(`${movie.title} - Stream Link`)
        .setDescription("Here is your stream link:")
        .setColor(0x9b59b6)
        .addFields({ name: "Stream Link", value: movie.stream_link })
        .setImage(movie.screenshots && movie.screenshots.length > 0 ? movie.screenshots[0] : movie.poster_url)
        .setTimestamp()

      // Send DM with stream link and screenshots
      await user.send({
        embeds: [embed],
        components: components,
      })

      // Reply to interaction
      await interaction.editReply({
        content: "Stream link sent to your DMs!",
        ephemeral: true,
      })
    } catch (dmError) {
      console.error("Failed to send DM:", dmError)
      await interaction.editReply({
        content:
          "I couldn't send you a DM. Please check your privacy settings and make sure you allow DMs from server members.",
        ephemeral: true,
      })
    }
  } catch (error) {
    console.error("Error sending stream link:", error)
    await interaction.editReply({
      content: "An error occurred while retrieving the stream link.",
      ephemeral: true,
    })
  }
}

// Send movie download link via DM
async function sendMovieDownloadLink(interaction, movieId) {
  await interaction.deferReply({ ephemeral: true })

  try {
    // Get movie data
    const { data: movie, error } = await supabase.from("movies").select("*").eq("id", movieId).single()

    if (error) throw error

    // Try to send DM
    try {
      const user = await client.users.fetch(interaction.user.id)

      // Create screenshots carousel if available
      const components = []
      if (movie.screenshots && movie.screenshots.length > 0) {
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("prev_screenshot").setLabel("Previous").setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId("next_screenshot").setLabel("Next").setStyle(ButtonStyle.Secondary),
        )
        components.push(row)
      }

      // Create embed for DM
      const embed = new EmbedBuilder()
        .setTitle(`${movie.title} - Download Link`)
        .setDescription("Here is your download link:")
        .setColor(0x9b59b6)
        .addFields({ name: "Download Link", value: movie.download_link })
        .setImage(movie.screenshots && movie.screenshots.length > 0 ? movie.screenshots[0] : movie.poster_url)
        .setTimestamp()

      // Send DM with download link and screenshots
      await user.send({
        embeds: [embed],
        components: components,
      })

      // Reply to interaction
      await interaction.editReply({
        content: "Download link sent to your DMs!",
        ephemeral: true,
      })
    } catch (dmError) {
      console.error("Failed to send DM:", dmError)
      await interaction.editReply({
        content:
          "I couldn't send you a DM. Please check your privacy settings and make sure you allow DMs from server members.",
        ephemeral: true,
      })
    }
  } catch (error) {
    console.error("Error sending download link:", error)
    await interaction.editReply({
      content: "An error occurred while retrieving the download link.",
      ephemeral: true,
    })
  }
}

// Handle series command
async function handleSeriesCommand(interaction) {
  const searchQuery = interaction.options.getString("title")

  // Defer reply to give us time to fetch data
  await interaction.deferReply()

  // Search for series in Supabase
  const { data: seriesList, error } = await supabase
    .from("series")
    .select("*")
    .ilike("title", `%${searchQuery}%`)
    .limit(1)

  if (error) {
    console.error("Supabase error:", error)
    return interaction.editReply("An error occurred while searching for the series.")
  }

  if (!seriesList || seriesList.length === 0) {
    return interaction.editReply(`No series found matching "${searchQuery}".`)
  }

  const series = seriesList[0]

  // Get seasons available for this series
  const { data: episodes, error: episodesError } = await supabase
    .from("episodes")
    .select("season")
    .eq("series_id", series.id)
    .order("season", { ascending: true })

  if (episodesError) {
    console.error("Supabase error:", episodesError)
    return interaction.editReply("An error occurred while retrieving episodes.")
  }

  // Get unique seasons
  const seasons = [...new Set(episodes.map((ep) => ep.season))]

  if (seasons.length === 0) {
    return interaction.editReply(`No episodes found for "${series.title}".`)
  }

  // Create embed for public reply
  const embed = new EmbedBuilder()
    .setTitle(series.title)
    .setDescription(series.description)
    .setColor(0x9b59b6)
    .setImage(series.poster_url)
    .setTimestamp()

  // Create season select menu
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId("select_season")
    .setPlaceholder("Select a season")
    .addOptions(
      seasons.map((season) =>
        new StringSelectMenuOptionBuilder().setLabel(`Season ${season}`).setValue(`${series.id}:${season}`),
      ),
    )

  const row = new ActionRowBuilder().addComponents(selectMenu)

  // Send public reply
  await interaction.editReply({
    embeds: [embed],
    components: [row],
  })
}

// Handle season selection
async function handleSeasonSelect(interaction) {
  await interaction.deferUpdate()

  const [seriesId, season] = interaction.values[0].split(":")

  // Get episodes for this season
  const { data: episodes, error } = await supabase
    .from("episodes")
    .select("*")
    .eq("series_id", seriesId)
    .eq("season", season)
    .order("episode", { ascending: true })

  if (error) {
    console.error("Supabase error:", error)
    return interaction.editReply("An error occurred while retrieving episodes.")
  }

  if (!episodes || episodes.length === 0) {
    return interaction.editReply(`No episodes found for Season ${season}.`)
  }

  // Create episode select menu
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId("select_episode")
    .setPlaceholder("Select an episode")
    .addOptions(
      episodes.map((ep) =>
        new StringSelectMenuOptionBuilder().setLabel(`S${ep.season}E${ep.episode}: ${ep.title}`).setValue(ep.id),
      ),
    )

  const row = new ActionRowBuilder().addComponents(selectMenu)

  // Update the message with episode selection
  await interaction.editReply({
    content: `Select an episode from Season ${season}:`,
    components: [row],
  })
}

// Handle episode selection
async function handleEpisodeSelect(interaction) {
  await interaction.deferUpdate()

  const episodeId = interaction.values[0]

  // Get episode data
  const { data: episode, error } = await supabase
    .from("episodes")
    .select("*, series:series_id(title)")
    .eq("id", episodeId)
    .single()

  if (error) {
    console.error("Supabase error:", error)
    return interaction.editReply("An error occurred while retrieving episode details.")
  }

  // Create buttons for stream and download
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`episode_stream_${episode.id}`).setLabel("Stream").setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`episode_download_${episode.id}`)
      .setLabel("Download")
      .setStyle(ButtonStyle.Secondary),
  )

  // Create embed for episode
  const embed = new EmbedBuilder()
    .setTitle(`${episode.series.title} - S${episode.season}E${episode.episode}: ${episode.title}`)
    .setColor(0x9b59b6)
    .setTimestamp()

  // Update the message with episode details
  await interaction.editReply({
    embeds: [embed],
    components: [row],
  })
}

// Send episode stream link via DM
async function sendEpisodeStreamLink(interaction, episodeId) {
  await interaction.deferReply({ ephemeral: true })

  try {
    // Get episode data
    const { data: episode, error } = await supabase
      .from("episodes")
      .select("*, series:series_id(title)")
      .eq("id", episodeId)
      .single()

    if (error) throw error

    // Try to send DM
    try {
      const user = await client.users.fetch(interaction.user.id)

      // Create screenshots carousel if available
      const components = []
      if (episode.screenshots && episode.screenshots.length > 0) {
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("prev_screenshot").setLabel("Previous").setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId("next_screenshot").setLabel("Next").setStyle(ButtonStyle.Secondary),
        )
        components.push(row)
      }

      // Create embed for DM
      const embed = new EmbedBuilder()
        .setTitle(`${episode.series.title} - S${episode.season}E${episode.episode}: ${episode.title}`)
        .setDescription("Here is your stream link:")
        .setColor(0x9b59b6)
        .addFields({ name: "Stream Link", value: episode.stream_link })
        .setImage(episode.screenshots && episode.screenshots.length > 0 ? episode.screenshots[0] : "")
        .setTimestamp()

      // Send DM with stream link and screenshots
      await user.send({
        embeds: [embed],
        components: components,
      })

      // Reply to interaction
      await interaction.editReply({
        content: "Stream link sent to your DMs!",
        ephemeral: true,
      })
    } catch (dmError) {
      console.error("Failed to send DM:", dmError)
      await interaction.editReply({
        content:
          "I couldn't send you a DM. Please check your privacy settings and make sure you allow DMs from server members.",
        ephemeral: true,
      })
    }
  } catch (error) {
    console.error("Error sending stream link:", error)
    await interaction.editReply({
      content: "An error occurred while retrieving the stream link.",
      ephemeral: true,
    })
  }
}

// Send episode download link via DM
async function sendEpisodeDownloadLink(interaction, episodeId) {
  await interaction.deferReply({ ephemeral: true })

  try {
    // Get episode data
    const { data: episode, error } = await supabase
      .from("episodes")
      .select("*, series:series_id(title)")
      .eq("id", episodeId)
      .single()

    if (error) throw error

    // Try to send DM
    try {
      const user = await client.users.fetch(interaction.user.id)

      // Create screenshots carousel if available
      const components = []
      if (episode.screenshots && episode.screenshots.length > 0) {
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId("prev_screenshot").setLabel("Previous").setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId("next_screenshot").setLabel("Next").setStyle(ButtonStyle.Secondary),
        )
        components.push(row)
      }

      // Create embed for DM
      const embed = new EmbedBuilder()
        .setTitle(`${episode.series.title} - S${episode.season}E${episode.episode}: ${episode.title}`)
        .setDescription("Here is your download link:")
        .setColor(0x9b59b6)
        .addFields({ name: "Download Link", value: episode.download_link })
        .setImage(episode.screenshots && episode.screenshots.length > 0 ? episode.screenshots[0] : "")
        .setTimestamp()

      // Send DM with download link and screenshots
      await user.send({
        embeds: [embed],
        components: components,
      })

      // Reply to interaction
      await interaction.editReply({
        content: "Download link sent to your DMs!",
        ephemeral: true,
      })
    } catch (dmError) {
      console.error("Failed to send DM:", dmError)
      await interaction.editReply({
        content:
          "I couldn't send you a DM. Please check your privacy settings and make sure you allow DMs from server members.",
        ephemeral: true,
      })
    }
  } catch (error) {
    console.error("Error sending download link:", error)
    await interaction.editReply({
      content: "An error occurred while retrieving the download link.",
      ephemeral: true,
    })
  }
}

// Login to Discord
client.login(process.env.DISCORD_BOT_TOKEN)
