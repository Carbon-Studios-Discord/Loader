import discord
from discord import app_commands
from discord.ext import commands
import os

TOKEN = os.getenv("BOT_TOKEN")
MY_SCRIPT = 'loadstring(game:HttpGet("https://raw.githubusercontent.com/CStudios-Dev/csLoader.lua/main/CSLoader.lua"))()'
IMAGE_URL = "https://cdn.discordapp.com/attachments/1424784310418014360/1456699055244710094/Screenshot_2026-01-03-01-19-35-95_680d03679600f7af0b4c700c6b270fe7.jpg"

class Menu(discord.ui.View):
    def __init__(self):
        super().__init__(timeout=None)

    @discord.ui.button(label="Mobile Copy", style=discord.ButtonStyle.secondary, emoji="🟣")
    async def copy_button(self, interaction: discord.Interaction, button: discord.ui.Button):
        await interaction.response.send_message(content=MY_SCRIPT, ephemeral=True)

class MyBot(commands.Bot):
    def __init__(self):
        intents = discord.Intents.default()
        super().__init__(command_prefix="!", intents=intents)

    async def setup_hook(self):
        # This syncs your slash commands with Discord
        await self.tree.sync()

bot = MyBot()

@bot.tree.command(name="loader", description="Get the Carbon Studios script")
async def loader(interaction: discord.Interaction):
    embed = discord.Embed(
        title="Carbon Studios Loader", 
        description=f"```lua\n{MY_SCRIPT}```",
        color=0x8A2BE2 
    )
    embed.set_thumbnail(url=IMAGE_URL)
    embed.add_field(
        name="Mobile Instructions", 
        value="1. Tap **Mobile Copy**.\n2. Long-press the hidden message.\n3. Tap **Copy Text**.", 
        inline=False
    )
    await interaction.response.send_message(embed=embed, view=Menu())

@bot.event
async def on_ready():
    await bot.change_presence(activity=discord.Game(name="/loader"))
    print(f"Logged in as {bot.user}")

if TOKEN:
    bot.run(TOKEN)
