import discord
from discord.ext import commands
import os
from flask import Flask
from threading import Thread

# --- WEB SERVER FOR RENDER FREE TIER ---
app = Flask('')
@app.route('/')
def home():
    return "Bot is alive!"

def run():
    # Render looks for port 8080 by default
    app.run(host='0.0.0.0', port=8080)

def keep_alive():
    t = Thread(target=run)
    t.start()

# --- DISCORD BOT CODE ---
TOKEN = os.getenv("BOT_TOKEN")
MY_SCRIPT = 'loadstring(game:HttpGet("https://raw.githubusercontent.com/CStudios-Dev/csLoader.lua/main/CSLoader.lua"))()'
IMAGE_URL = "https://cdn.discordapp.com/attachments/1424784310418014360/1456699055244710094/Screenshot_2026-01-03-01-19-35-95_680d03679600f7af0b4c700c6b270fe7.jpg"

intents = discord.Intents.default()
intents.message_content = True
bot = commands.Bot(command_prefix="!", intents=intents)

class Menu(discord.ui.View):
    def __init__(self):
        super().__init__(timeout=None)
    @discord.ui.button(label="Mobile Copy", style=discord.ButtonStyle.secondary, emoji="🟣")
    async def copy_button(self, interaction: discord.Interaction, button: discord.ui.Button):
        await interaction.response.send_message(content=MY_SCRIPT, ephemeral=True)

@bot.command()
async def loader(ctx):
    embed = discord.Embed(title="Carbon Studios Loader", description=f"```lua\n{MY_SCRIPT}```", color=0x8A2BE2)
    embed.set_thumbnail(url=IMAGE_URL)
    await ctx.send(embed=embed, view=Menu())

@bot.event
async def on_ready():
    print(f"Logged in as {bot.user}")

# Start the web server then start the bot
keep_alive()
if TOKEN:
    bot.run(TOKEN)
