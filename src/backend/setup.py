from setuptools import setup, find_packages
import os
from pathlib import Path

here = Path(__file__).parent.absolute()
README = open(here / 'README.md', encoding='utf-8').read()

def get_requirements():
    """Parse requirements.txt file to get list of dependencies"""
    requirements_path = here / 'requirements.txt'
    try:
        with open(requirements_path, encoding='utf-8') as f:
            requirements = [
                line.strip() for line in f
                if line.strip() and not line.startswith('#')
            ]
        return requirements
    except FileNotFoundError:
        # Default requirements if requirements.txt is not found
        return [
            'fastapi>=0.104.0',
            'langchain>=0.0.335',
            'chromadb>=0.4.18',
            'torch>=2.1.0',
            'uvicorn>=0.23.0',
            'pydantic>=2.4.0',
            'python-multipart>=0.0.6',
            'sqlalchemy>=2.0.0',
            'openai>=1.3.0',
            'pymupdf>=1.23.0',
            'beautifulsoup4>=4.12.0',
            'requests>=2.31.0',
            'python-dotenv>=1.0.0',
            'elevenlabs>=0.2.26',
            'numpy>=1.24.0',
            'pandas>=2.0.0',
            'cryptography>=41.0.0',
            'whisper>=20231117',
            'serpapi>=0.1.0',
            'faiss-cpu>=1.7.4',
            'docx2txt>=0.8',
            'pytest>=7.4.0'
        ]

setup(
    name='personal-ai-agent-backend',
    version='0.1.0',
    description='Local-first, memory-augmented AI companion backend',
    long_description=README,
    long_description_content_type='text/markdown',
    author='Personal AI Agent Team',
    author_email='info@example.com',
    url='https://github.com/example/personal-ai-agent',
    packages=find_packages(exclude=['tests', 'tests.*']),
    python_requires='>=3.11',
    install_requires=get_requirements(),
    entry_points={
        'console_scripts': [
            'personal-ai-agent=main:main',
        ],
    },
    classifiers=[
        'Development Status :: 4 - Beta',
        'Intended Audience :: End Users/Desktop',
        'License :: OSI Approved :: MIT License',
        'Programming Language :: Python :: 3',
        'Programming Language :: Python :: 3.11',
        'Topic :: Scientific/Engineering :: Artificial Intelligence',
    ],
)