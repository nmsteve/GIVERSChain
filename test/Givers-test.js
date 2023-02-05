

const { expect } = require("chai");
const { ethers } = require("hardhat");
const {assert} = require('chai')
const type = require('type-detect');





  let GiversToken;
  let hardhatToken;
  let owner;
  let addr1;
  let addr2;
  let addr3;
  let addr4;
  let addr5;
  let addr6;
  let initialLiquidty;
  let supply;
  
  
  
  describe("Givers Chain", function () {

    beforeEach(async function () {
      
      GiversToken =  await ethers.getContractFactory("GiversChain");

      [owner, addr1, addr2, addr3, addr4,addr5,addr6,...addrs] = await ethers.getSigners();

      hardhatToken = await GiversToken.deploy(addr1.address,addr2.address,process.env.ROUTER02);
      await hardhatToken.deployed()
        this.provider = ethers.provider;

        //set Factory
      //   this.factory = new ethers.Contract(
      //     process.env.FACTORY,
      //     ['function getPair(address tokenA, address tokenB) external view returns (address pair)'],
      //     this.provider
      //   )
      //    this.factorysigner = this.factory.connect(owner)

         //set Pair
         //const pairAddress = await this.factorysigner.callStatic.createPair(process.env.giversEdited, process.env.WETH)
        this.pairAddress = hardhatToken.uniswapV2Pair()
         this.pair = new ethers.Contract(
           this.pairAddress,
           ['function totalSupply() external view returns (uint)','function balanceOf(address owner) external view returns (uint)','function approve(address spender, uint value) external returns (bool)','function decimals() external pure returns (uint8)','function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)'],
           this.provider
         )
         this.pairsigner =this.pair.connect(owner)

         //set touter
         this.router02 = new ethers.Contract(
          process.env.ROUTER02,
          ['function addLiquidityETH(address token, uint amountTokenDesired, uint amountTokenMin, uint amountETHMin, address to, uint deadline) external payable returns (uint amountToken, uint amountETH, uint liquidity)', 'function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)', 'function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)', 'function swapExactTokensForETHSupportingFeeOnTransferTokens( uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external','function removeLiquidityETHSupportingFeeOnTransferTokens( address token,uint liquidity,uint amountTokenMin,uint amountETHMin,address to,uint deadline) external returns (uint amountETH)'], 
          this.provider);
         this.routersigner = this.router02.connect(owner)
         

         //add liquidty
         await hardhatToken.approve(process.env.ROUTER02, ethers.utils.parseEther("10000000"));
         initialLiquidty = ethers.utils.parseEther('10000000')
         const eTH = 5
         await this.routersigner.addLiquidityETH(
           hardhatToken.address,
           initialLiquidty,
           0,
           eTH,
           owner.address,
           Math.floor(Date.now() / 1000) + 60 * 10,
           {value : ethers.utils.parseEther("200")}
           )

            
            

    }) 
    describe("Deployment", function () {

        it("Should set the right supply amount",async function (){
            expect(await hardhatToken.totalSupply()).to.equal(ethers.utils.parseEther('1000000000'))
        })

      });
    describe("Transfers:Before swapAndLiquify is enabled", function () {

      it("Should transfer with no fee for excluded accounts ", async function () {
        // Transfer 50 tokens from owner to addr1

        //await hardhatToken.excludeFromFee(owner.address)
        await hardhatToken.excludeFromFee(addr1.address)
        await hardhatToken.excludeFromFee(addr2.address)
        const amount =ethers.utils.parseEther('50')
        const remoteLiquidity = ethers.utils.parseEther('30000000')

        await hardhatToken.transfer(addr1.address,amount);
        const addr1Balance = await hardhatToken.balanceOf(addr1.address);
        expect(addr1Balance).to.equal( amount);

        // Transfer 50 tokens from addr1 to addr2
        // We use .connect(signer) to send a transaction from another account
        await hardhatToken.connect(addr1).transfer(addr2.address, amount);
        const addr2Balance = await hardhatToken.balanceOf(addr2.address);
        expect(addr2Balance).to.equal(amount);
      });


      it("Should transfer with fee for included accounts ", async function () {

        //check reflection supply && true supply
        supply = await hardhatToken._getCurrentSupply()
        const {0: rsupply, 1: tsupply} = supply
        const rate = await hardhatToken._getRate()
        expect(rsupply > tsupply)

        // Transfer'50' tokens from owner to addr3 (expect balance of addr3 to be equal to'50')
        await hardhatToken.transfer(addr3.address, ethers.utils.parseEther('50'));
        const addr3Balance = await hardhatToken.balanceOf(addr3.address);
        expect(addr3Balance ).to.equal(ethers.utils.parseEther('50'));

        // Transfer'50' tokens from addr3 to addr4 (expect a fee of 13%)
        // We use .connect(signer) to send a transaction from another account
        await hardhatToken.connect(addr3).transfer(addr4.address, ethers.utils.parseEther('50'));
        const addr3Balance2 = await hardhatToken.balanceOf(addr3.address)
        const addr4Balance = await hardhatToken.balanceOf(addr4.address);
        const reflect = (addr4Balance - ethers.utils.parseEther('43.5'))/ethers.utils.parseEther('43.5')
        expect(0).to.be.equal(addr3Balance2)
        expect(true).to.be.equals(reflect > 0 && reflect < 2 )


        //Transfer 30 tokens from addr4 to addr5 (expect a fee of 13%)
        await hardhatToken.connect(addr4).transfer(addr5.address, ethers.utils.parseEther('30'));
        const addr4Balance2 = await hardhatToken.balanceOf(addr4.address);
        const addr5Balance = await hardhatToken.balanceOf(addr5.address);
        const reflection2 = (addr5Balance - ethers.utils.parseEther('26.1'))/ethers.utils.parseEther('26.1')

         expect(true).to.be.equal(ethers.utils.parseEther('13') < addr4Balance2 && addr4Balance2 < ethers.utils.parseEther('14'));
         expect(true).to.be.equal(reflection2 > 0 && reflection2 < 2)


      });
      it('Should not send fee to Charity and marketing wallet', async function () {
      
        //get Charitywallet and MarketingWallet balance before transfer
        const charityWalletBefore = await hardhatToken.balanceOf(addr1.address)
        const MarketingWalletBefore = await hardhatToken.balanceOf(addr2.address)

        //Transfer from owner to  addr3 to addr4 (expect charges of 0%)
        await hardhatToken.transfer(addr3.address, 150)
        await hardhatToken.connect(addr3).transfer(addr4.address,100)

        //get Charitywallet and MarketingWallet balance after transfer
        const charityWalletAfter = await hardhatToken.balanceOf(addr1.address)
        const MarketingWalletAfter = await hardhatToken.balanceOf(addr2.address)
        
        const  marketingDiff= MarketingWalletAfter - MarketingWalletBefore
        const  charityDiff= charityWalletAfter - charityWalletBefore
        
        expect(marketingDiff).to.be.equal(0)
        expect(charityDiff).to.be.equal(0)

      })

      it('should send fee to burn wallet', async function () {

       const burnBalanceBefore = await hardhatToken.balanceOf('0x000000000000000000000000000000000000dEaD')

       // Transfer'200' tokens from owner to addr3 (expect balance of addr3 to be equal to'200')
       await hardhatToken.transfer(addr3.address, ethers.utils.parseEther('200'));
       const addr3Balance = await hardhatToken.balanceOf(addr3.address);
       expect(addr3Balance ).to.equal(ethers.utils.parseEther('200'));
       expect(burnBalanceBefore).to.be.equal(0)

       //Transfer'200' tokens from addr3 to addr4 (expect 1% (2) is sent to burn wallent)
       await hardhatToken.connect(addr3).transfer(addr4.address, ethers.utils.parseEther('200'));
       const burnBalanceAfter = await hardhatToken.balanceOf('0x000000000000000000000000000000000000dEaD')

       
       expect(true).to.be.equal(burnBalanceAfter > ethers.utils.parseEther('2') && burnBalanceAfter < ethers.utils.parseEther('3') )

        

      })
    });
    
    describe('Transfers:After swapAndLiquify is enabled', function(){
      beforeEach(async function(){
        hardhatToken.setSwapAndLiquifyEnabled(true);
      })
      it("Should transfer with no fee for excluded accounts ", async function () {
        // Transfer 50,000,000 tokens from owner to addr1

        //await hardhatToken.excludeFromFee(owner.address)
        await hardhatToken.excludeFromFee(addr1.address)
        await hardhatToken.excludeFromFee(addr2.address)
        const amount =ethers.utils.parseEther('50000000') 

        await hardhatToken.transfer(addr1.address,amount );
        const addr1Balance = await hardhatToken.balanceOf(addr1.address);
        expect(addr1Balance).to.equal( amount);

        // Transfer 50 tokens from addr1 to addr2
        // We use .connect(signer) to send a transaction from another account
        await hardhatToken.connect(addr1).transfer(addr2.address, amount);
        const addr2Balance = await hardhatToken.balanceOf(addr2.address);
        expect(addr2Balance).to.equal(amount);

        //Treansfer back to owner  
        await hardhatToken.connect(addr2).transfer(owner.address, amount);
        const ownerBalance = await hardhatToken.balanceOf(owner.address);

        //expect balance to be equal  to totalsupply sub initialLiquidty
        expect(ethers.utils.parseEther('990000000')).to.equal(ownerBalance);

      });

      it("Should transfer with fee for included accounts ", async function () {

        //check reflection supply && true supply
        supply = await hardhatToken._getCurrentSupply()
        const {0: rsupply, 1: tsupply} = supply
        expect(rsupply > tsupply)

  

        // Transfer'50,000,000' tokens from owner to addr3 (expect balance of addr3 to be equal to'50,000,000')
        await hardhatToken.transfer(addr3.address, ethers.utils.parseEther('50000000'));
        const addr3Balance = await hardhatToken.balanceOf(addr3.address);
        expect(addr3Balance ).to.equal(ethers.utils.parseEther('50000000'));

        //Transfer'50,000,000' tokens from addr3 to addr4 (expect a fee of 13%)
        await hardhatToken.connect(addr3).transfer(addr4.address, ethers.utils.parseEther('50000000'));
        const addr3Balance2 = await hardhatToken.balanceOf(addr3.address)
        const addr4Balance = await hardhatToken.balanceOf(addr4.address);
        const reflect = (addr4Balance - ethers.utils.parseEther('43000000'))/ethers.utils.parseEther('5000000')
        expect(0).to.be.equal(addr3Balance2)
        expect(true).to.be.equals(reflect > 0 && reflect < 3 )
        expect(44).to.be.equal(Math.round(addr4Balance/10**24))


        //Transfer 30,000,000 tokens from addr4 to addr5 (expect a fee of 10%)
        // await hardhatToken.connect(addr4).transfer(addr5.address, ethers.utils.parseEther('30000000'));
        // const addr4Balance2 = await hardhatToken.balanceOf(addr4.address);
        // const addr5Balance = await hardhatToken.balanceOf(addr5.address);
        // const reflection2 = (addr5Balance - ethers.utils.parseEther('26100000'))/ethers.utils.parseEther('30000000')

        // expect(true).to.be.equal(ethers.utils.parseEther('15000000') < addr4Balance2 && addr4Balance2 < ethers.utils.parseEther('16000000'));
        // expect(true).to.be.equal(reflection2 > 0 && reflection2 < 3)
        // expect(27).to.be.equal(Math.round(addr5Balance/10**24))

        // //Transfer 20,000,000 tokens from addr5 to addr6 (expect a fee of 10%)
        // await hardhatToken.connect(addr5).transfer(addr6.address, ethers.utils.parseEther('20000000'));
        // const addr5Balance2 = await hardhatToken.balanceOf(addr5.address);
        // const addr6Balance = await hardhatToken.balanceOf(addr6.address);
        // const reflection3 = (addr6Balance - ethers.utils.parseEther('18000000'))/ethers.utils.parseEther('20000000')

        // expect(true).to.equal(ethers.utils.parseEther('7000000') < addr5Balance2 && addr5Balance2 < ethers.utils.parseEther('8000000'));
        // expect(true).to.equal(0 < reflection3 && reflection3 < 3)
        // expect(18).to.be.equal(Math.round(addr6Balance/10**24))

      });

      it('Should send fee to Charity and marketing wallet', async function () {
      
        //get Charitywallet,MarketingWallet and this contract balances  before transfer
        const charityBalanceBefore = await this.provider.getBalance(addr1.address)
        const marketingBalanceBefore = await this.provider.getBalance(addr2.address)
        const tokenContractBalanceBefore = await this.provider.getBalance(hardhatToken.address)
        expect(true).to.be.equal(charityBalanceBefore < marketingBalanceBefore && tokenContractBalanceBefore < marketingBalanceBefore)
       

        // Transfer'50,000,000' tokens from owner to addr3 
        await hardhatToken.transfer(addr3.address, ethers.utils.parseEther('50000000')); 
        //Transfer'50,000,000' tokens from addr3 to addr4 (unlock swap and Liquidfy)
        await hardhatToken.connect(addr3).transfer(addr4.address, ethers.utils.parseEther('50000000'));
        //Transfer 30,000,000 tokens from addr4 to addr5 (trigger swap and Liquidfy)
        await hardhatToken.connect(addr4).transfer(addr5.address, ethers.utils.parseEther('30000000'));

      
         //get Charitywallet, MarketingWallet and Tokencontract balance after swap and liquidfy
         const charityBalanceAfter = await this.provider.getBalance(addr1.address)
         const marketingBalanceAfter = await this.provider.getBalance(addr2.address)
         const tokenContractBalanceAfter = await this.provider.getBalance(hardhatToken.address)
         const  marketingDiff= (marketingBalanceAfter - marketingBalanceBefore)/10**18
         const  charityDiff= (charityBalanceAfter - charityBalanceBefore)/10**18
         const  tokenDiff= (tokenContractBalanceAfter - tokenContractBalanceBefore)/10**18

          expect(8).to.be.equal(Math.round(marketingDiff))
          expect(5).to.be.equal(Math.round(charityDiff))
          expect(0).to.be.equal(tokenDiff)

      });
    
    });
    describe("Liquidity", function () {

      it("Should add right amount of liquidty", async function(){

            const Ownerliquidity = await this.pairsigner.balanceOf(owner.address)
            const totalLiquidity = await this.pairsigner.totalSupply()
            const decimals = await this.pairsigner.decimals()

            const reserves = await this.pairsigner.getReserves()
            const {0: reserve0, 1:reserve1, 3: blockTimestampLast} = reserves
            const ETH = reserve0/10**18
            const GIVERS = reserve1/10**18

            const MINIMUM_LIQUIDITY = 10**3;
            const lpTokenAmount = (Math.sqrt( ETH* GIVERS));
            

            expect(true).to.be.equal(ETH ===200|| ETH === 10000000)
            expect(true).to.be.equal(GIVERS === 10000000 || GIVERS ===200)
            expect(decimals).to.be.equal(18)
            
            expect(totalLiquidity/10**decimals).to.be.equal(Ownerliquidity/10**decimals)
            expect(lpTokenAmount).to.be.equals(Ownerliquidity/10**decimals)
      }); 

      it("Should remove half Liquidity", async function() {

          const GIVERS = 10000000; const ETH = 200;
          const lp = (Math.sqrt(GIVERS * ETH))*10**18;
          const half = (lp/2)
          var otherhalf = lp - half
          
          await this.pairsigner.approve(process.env.ROUTER02, BigInt(half));
          await this.routersigner.removeLiquidityETHSupportingFeeOnTransferTokens(
            hardhatToken.address,
            BigInt(half),
            0,
            0,
            owner.address,
            Math.floor(Date.now() / 1000) + 60 * 10,
            ) 

         var ownerBal = await this.pairsigner.balanceOf(owner.address);
         otherhalf = otherhalf/10**18
         ownerBal = ownerBal/10**18

          expect(ownerBal.toFixed(5)).to.be.equal(otherhalf.toFixed(5))

      });

    });

  })
