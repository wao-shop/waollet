"""Packaging settings."""

from setuptools import find_packages, setup

setup(
    name="waollet-cli",
    version="0.0.1",
    description="",
    long_description="",
    url="",
    author="Wao Team",
    author_email="devel@wao.shop.com",
    license="UNLICENSED",
    classifiers=[
        "Intended Audience :: Developers",
        "Topic :: Utilities",
        "Natural Language :: English",
        "Operating System :: OS Independent",
        "Programming Language :: Python :: 3.7",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.10",
    ],
    keywords="cli",
    packages=find_packages(exclude=["docs", "tests*"]),
    include_package_data=True,
    install_requires=[
        "pyteal==0.9.1",
        "black==22.1.0",
        "py-algorand-sdk==1.9.0",
        "pytest",
    ],
    entry_points={"console_scripts": ["waollet-cli=waollet.main:main"]},
)
