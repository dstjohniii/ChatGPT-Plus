# backend/app.py

import os
from flask import Flask, request, jsonify, Response, stream_with_context
import openai
from dotenv import load_dotenv
from sqlalchemy.exc import InvalidRequestError

from models import db, Prompt, Chat
from flask_cors import CORS
import logging
import traceback
from openai import OpenAIError, RateLimitError, OpenAI

load_dotenv()

app = Flask(__name__)
CORS(app)

# Configurations
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Initialize OpenAI API key
openai.api_key = os.environ.get("OPENAI_API_KEY")

db.init_app(app)

with app.app_context():
    db.create_all()

# Routes

@app.route('/api/chats', methods=['POST'])
def create_chat():
    data = request.get_json()
    title = data.get('title', 'New Chat')
    chat = Chat(title=title)
    db.session.add(chat)
    db.session.commit()
    return jsonify({
        'id': chat.id,
        'title': chat.title,
        'created_at': chat.created_at.isoformat()
    }), 201

@app.route('/api/chats', methods=['GET'])
def get_chats():
    chats = Chat.query.order_by(Chat.created_at.desc()).all()
    data = [{
        'id': c.id,
        'title': c.title,
        'created_at': c.created_at.isoformat()
    } for c in chats]
    return jsonify(data)

@app.route('/api/chats/<int:chat_id>/messages', methods=['GET'])
def get_chat_messages(chat_id):
    prompts = Prompt.query.filter_by(chat_id=chat_id).order_by(Prompt.id).all()
    data = [{
        'id': p.id,
        'content': p.content,
        'response': p.response,
        'model': p.model,
        'temperature': p.temperature,
        'role': p.role,
        'chat_id': p.chat_id
    } for p in prompts]
    return jsonify(data)

@app.route('/api/chats/<int:chat_id>/title', methods=['PUT'])
def update_chat_title(chat_id):
    data = request.get_json()
    new_title = data.get('title')
    if not new_title:
        return jsonify({'error': 'Title is required'}), 400
    chat = Chat.query.get(chat_id)
    if not chat:
        return jsonify({'error': 'Chat not found'}), 404
    chat.title = new_title
    db.session.commit()
    return jsonify({
        'id': chat.id,
        'title': chat.title,
        'created_at': chat.created_at.isoformat()
    })

@app.route('/api/chat', methods=['POST'])
def chat():
    data = request.get_json()
    prompt_text = data.get('prompt')
    chat_id = data.get('chat_id')
    model = data.get('model', 'gpt-3.5-turbo')  # Use a supported model
    temperature = float(data.get('temperature', 0.7))
    role = data.get('role', 'You are a helpful assistant.')

    if not chat_id:
        return jsonify({'error': 'chat_id is required'}), 400

    try:
        # Fetch previous messages in the chat
        previous_prompts = Prompt.query.filter_by(chat_id=chat_id).order_by(Prompt.id).all()

        # Build the messages list
        messages = [{"role": "system", "content": role}]

        for p in previous_prompts:
            messages.append({"role": "user", "content": p.content})
            messages.append({"role": "assistant", "content": p.response})

        # Add the new user message
        messages.append({"role": "user", "content": prompt_text})

        # Function to stream the response
        def generate():
            accumulated_response = ""
            client = OpenAI()

            response = client.chat.completions.create(
                model=model,
                messages=messages,
                temperature=temperature,
                stream=True  # Enable streaming
            )

            for chunk in response:
                if 'choices' in chunk and len(chunk.choices) > 0:
                    delta = chunk.choices[0].delta
                    if 'content' in delta:
                        content = delta['content']
                        accumulated_response += content
                        yield content

            # Save to the database after streaming is complete
            prompt = Prompt(
                content=prompt_text,
                response=accumulated_response,
                model=model,
                temperature=temperature,
                role=role,
                chat_id=chat_id
            )
            db.session.add(prompt)
            db.session.commit()

        return Response(stream_with_context(generate()), mimetype='text/plain')

    except RateLimitError as e:
        logging.error("Rate limit error occurred: %s", traceback.format_exc())
        return jsonify({'error': 'Rate limit exceeded. Please try again later.'}), 429
    except InvalidRequestError as e:
        logging.error("Invalid request error occurred: %s", traceback.format_exc())
        return jsonify({'error': str(e)}), 400
    except OpenAIError as e:
        logging.error("OpenAI API error occurred: %s", traceback.format_exc())
        return jsonify({'error': str(e)}), 500
    except Exception as e:
        logging.error("An unexpected error occurred: %s", traceback.format_exc())
        return jsonify({'error': 'An unexpected error occurred on the server.'}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
